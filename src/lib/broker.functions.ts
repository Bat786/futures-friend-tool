import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { instrumentBySymbol, type Timeframe } from "./market";
import { fetchBars } from "./bars.server";
import { computeSignal, DEFAULT_WEIGHTS, type SignalWeights } from "./signal";
import { resolveContractId } from "./contracts.server";
import {
  readConfig,
  isDemo,
  searchAccounts,
  searchPositions,
  searchOrders,
  placeOrder,
  closeContract,
  cancelOrder,
} from "./topstepx.server";
import { checkPreTrade, dailyStateFromTrades, type RiskLimits } from "./risk";
import {
  toAccountDTO,
  toOrderDTO,
  toPositionDTO,
  type BrokerAccountDTO,
  type BrokerOrderDTO,
  type BrokerPositionDTO,
} from "./broker-types";

export const getBrokerStatus = createServerFn({ method: "GET" }).handler(async () => {
  const cfg = readConfig();
  return {
    configured: cfg !== null,
    demo: cfg ? isDemo(cfg) : true,
    baseUrl: cfg ? cfg.baseUrl : null,
  };
});

export const getBars = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        symbol: z.string(),
        timeframe: z.enum(["1m", "5m", "15m", "1h", "1d"]),
        count: z.number().int().min(50).max(1500).default(300),
      })
      .parse(input),
  )
  .handler(async ({ data }) => fetchBars(data.symbol, data.timeframe as Timeframe, data.count));

/**
 * Direct analogue of the reference `fetch_signal()`: bars in, composite signal
 * out, so the gauge is one call.
 */
export const getSignal = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        symbol: z.string(),
        timeframe: z.enum(["1m", "5m", "15m", "1h", "1d"]),
        count: z.number().int().min(50).max(1500).default(300),
        weights: z
          .object({
            rsi: z.number().min(0).max(5),
            vwap: z.number().min(0).max(5),
            macd: z.number().min(0).max(5),
            momentum: z.number().min(0).max(5),
          })
          .optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const result = await fetchBars(data.symbol, data.timeframe as Timeframe, data.count);
    return {
      signal: computeSignal(result.bars, data.timeframe as Timeframe, data.weights),
      source: result.source,
      error: result.error,
    };
  });

export const getAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const cfg = readConfig();
    if (!cfg) return { configured: false, accounts: [] as BrokerAccountDTO[] };
    const res = await searchAccounts(cfg);
    return { configured: true, accounts: (res.accounts ?? []).map(toAccountDTO) };
  });

export const getPositions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ accountId: z.number().int() }).parse(input))
  .handler(async ({ data }) => {
    const cfg = readConfig();
    if (!cfg) return { configured: false, positions: [] as BrokerPositionDTO[] };
    const res = await searchPositions(cfg, data.accountId);
    return { configured: true, positions: (res.positions ?? []).map(toPositionDTO) };
  });

export const getRecentOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ accountId: z.number().int() }).parse(input))
  .handler(async ({ data }) => {
    const cfg = readConfig();
    if (!cfg) return { configured: false, orders: [] as BrokerOrderDTO[] };
    const since = new Date(Date.now() - 7 * 86400_000).toISOString();
    const res = await searchOrders(cfg, data.accountId, since);
    return { configured: true, orders: (res.orders ?? []).map(toOrderDTO) };
  });

/**
 * Supervised order placement. The risk gate is evaluated here as well as in the
 * UI, so a stale browser tab can never bypass the user's own limits.
 */
export const submitOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        accountId: z.number().int(),
        symbol: z.string(),
        type: z.number().int(),
        side: z.number().int().min(0).max(1),
        size: z.number().int().min(1).max(50),
        limitPrice: z.number().nullable().optional(),
        stopPrice: z.number().nullable().optional(),
        stopLossTicks: z.number().int().min(0).max(2000).nullable().optional(),
        takeProfitTicks: z.number().int().min(0).max(4000).nullable().optional(),
        supervised: z.boolean(),
        customTag: z.string().max(60).nullable().optional(),
        timeframe: z.enum(["1m", "5m", "15m", "1h", "1d"]).default("5m"),
        setupTag: z.string().max(60).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: settings } = await supabase
      .from("risk_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const limits: RiskLimits = {
      dailyLossLimit: Number(settings?.daily_loss_limit ?? 500),
      maxTradesPerDay: settings?.max_trades_per_day ?? 10,
      maxConsecutiveLosses: settings?.max_consecutive_losses ?? 3,
      maxPositionSize: settings?.max_position_size ?? 2,
      killSwitchArmed: settings?.kill_switch_armed ?? false,
    };

    const { data: closed } = await supabase
      .from("trades")
      .select("pnl, exit_time")
      .eq("user_id", userId)
      .eq("status", "closed")
      .eq("is_backtest", false)
      .not("exit_time", "is", null);

    const state = dailyStateFromTrades(
      (closed ?? []).map((t) => ({ pnl: t.pnl === null ? null : Number(t.pnl), exit_time: t.exit_time })),
    );

    const check = checkPreTrade(limits, state, data.size, data.supervised);
    if (!check.allowed) return { ok: false as const, blocked: true as const, reason: check.reason };

    const cfg = readConfig();
    if (!cfg) {
      return {
        ok: false as const,
        blocked: false as const,
        reason: "Broker credentials are not configured yet.",
      };
    }

    const inst = instrumentBySymbol(data.symbol);
    const contractId = await resolveContractId(data.symbol);
    const weights: SignalWeights = {
      rsi: Number(settings?.weight_rsi ?? DEFAULT_WEIGHTS.rsi),
      vwap: Number(settings?.weight_vwap ?? DEFAULT_WEIGHTS.vwap),
      macd: Number(settings?.weight_macd ?? DEFAULT_WEIGHTS.macd),
      momentum: Number(settings?.weight_momentum ?? DEFAULT_WEIGHTS.momentum),
    };
    try {
      const res = await placeOrder(cfg, {
        accountId: data.accountId,
        contractId,
        type: data.type,
        side: data.side,
        size: data.size,
        limitPrice: data.limitPrice ?? null,
        stopPrice: data.stopPrice ?? null,
        customTag: data.customTag ?? null,
        stopLossBracket: data.stopLossTicks ? { ticks: data.stopLossTicks, type: 4 } : null,
        takeProfitBracket: data.takeProfitTicks ? { ticks: data.takeProfitTicks, type: 1 } : null,
      });
      if (res.success === false) {
        return { ok: false as const, blocked: false as const, reason: res.errorMessage ?? "Order rejected by broker." };
      }

      // Snapshot the signal that preceded this entry so the journal can later
      // measure which readings actually preceded winners.
      let tradeId: string | null = null;
      try {
        const barsResult = await fetchBars(data.symbol, data.timeframe as Timeframe, 300);
        const signal = computeSignal(barsResult.bars, data.timeframe as Timeframe, weights);
        const entryPrice = data.limitPrice ?? data.stopPrice ?? signal.lastPrice ?? null;
        const side = data.side === 0 ? "buy" : "sell";
        const stopPrice =
          entryPrice !== null && data.stopLossTicks
            ? side === "buy"
              ? entryPrice - data.stopLossTicks * inst.tickSize
              : entryPrice + data.stopLossTicks * inst.tickSize
            : null;
        const targetPrice =
          entryPrice !== null && data.takeProfitTicks
            ? side === "buy"
              ? entryPrice + data.takeProfitTicks * inst.tickSize
              : entryPrice - data.takeProfitTicks * inst.tickSize
            : null;
        const riskAtEntry =
          entryPrice !== null && stopPrice !== null
            ? Number(((Math.abs(entryPrice - stopPrice) / inst.tickSize) * inst.tickValue * data.size).toFixed(2))
            : null;

        const { data: trade } = await supabase
          .from("trades")
          .insert({
            user_id: userId,
            account_id: String(data.accountId),
            contract_id: contractId,
            symbol: data.symbol,
            side,
            size: data.size,
            entry_price: entryPrice,
            entry_time: new Date().toISOString(),
            stop_price: stopPrice,
            target_price: targetPrice,
            risk_at_entry: riskAtEntry,
            setup_tag: data.setupTag ?? null,
            custom_tag: data.customTag ?? null,
            order_ids: res.orderId ? [String(res.orderId)] : [],
            status: "open",
          })
          .select("id")
          .single();

        tradeId = trade?.id ?? null;
        const savedTradeId = tradeId;
        if (savedTradeId) {
          const rows = signal.readings.map((r) => ({
            user_id: userId,
            trade_id: savedTradeId,
            indicator_name: r.name,
            value_at_entry: Number.isFinite(r.value) ? r.value : null,
            direction: r.direction,
            timeframe: data.timeframe,
          })) as {
            user_id: string;
            trade_id: string;
            indicator_name: string;
            value_at_entry: number | null;
            direction: string;
            timeframe: string;
          }[];
          rows.push({
            user_id: userId,
            trade_id: savedTradeId,
            indicator_name: "Composite",
            value_at_entry: signal.score,
            direction: signal.direction,
            timeframe: data.timeframe,
          });
          await supabase.from("signals").insert(rows);
        }
      } catch {
        // Journaling must never fail an order that the broker already accepted.
      }

      return { ok: true as const, orderId: res.orderId ?? null, tradeId };
    } catch (error) {
      return {
        ok: false as const,
        blocked: false as const,
        reason: error instanceof Error ? error.message : "Order failed.",
      };
    }
  });

/** Kill switch: flatten every open position and cancel every working order. */
export const flattenAll = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ accountId: z.number().int() }).parse(input))
  .handler(async ({ data }) => {
    const cfg = readConfig();
    if (!cfg) return { ok: false as const, reason: "Broker credentials are not configured yet.", flattened: 0, cancelled: 0 };

    let flattened = 0;
    let cancelled = 0;
    const errors: string[] = [];

    try {
      const positions = (await searchPositions(cfg, data.accountId)).positions ?? [];
      for (const raw of positions) {
        const contractId = (raw as { contractId?: string }).contractId;
        if (!contractId) continue;
        const res = await closeContract(cfg, data.accountId, contractId);
        if (res.success === false) errors.push(res.errorMessage ?? `Could not flatten ${contractId}`);
        else flattened++;
      }

      const since = new Date(Date.now() - 2 * 86400_000).toISOString();
      const orders = (await searchOrders(cfg, data.accountId, since)).orders ?? [];
      for (const raw of orders) {
        const order = raw as { id?: number; status?: number };
        // Status 1 = working / open on the ProjectX gateway.
        if (order.id && order.status === 1) {
          const res = await cancelOrder(cfg, data.accountId, order.id);
          if (res.success === false) errors.push(res.errorMessage ?? `Could not cancel order ${order.id}`);
          else cancelled++;
        }
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Kill switch failed");
    }

    return {
      ok: errors.length === 0,
      reason: errors.join(" · ") || null,
      flattened,
      cancelled,
    };
  });