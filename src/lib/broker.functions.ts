import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { simulateBars, instrumentBySymbol, timeframeSeconds, type Bar, type Timeframe } from "./market";
import {
  readConfig,
  isDemo,
  searchAccounts,
  searchPositions,
  searchOrders,
  placeOrder,
  closeContract,
  cancelOrder,
  retrieveBars,
  timeframeToUnit,
} from "./topstepx.server";
import { checkPreTrade, dailyStateFromTrades, type RiskLimits } from "./risk";

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
  .handler(async ({ data }) => {
    const inst = instrumentBySymbol(data.symbol);
    const cfg = readConfig();
    if (cfg) {
      try {
        const { unit, unitNumber } = timeframeToUnit(data.timeframe);
        const end = new Date();
        const start = new Date(
          end.getTime() - timeframeSeconds(data.timeframe as Timeframe) * 1000 * data.count * 3,
        );
        const res = await retrieveBars(cfg, {
          contractId: inst.contractId,
          unit,
          unitNumber,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          limit: data.count,
        });
        const bars: Bar[] = (res.bars ?? [])
          .map((b) => ({
            time: Math.floor(new Date(b.t).getTime() / 1000),
            open: b.o,
            high: b.h,
            low: b.l,
            close: b.c,
            volume: b.v,
          }))
          .sort((a, b) => a.time - b.time);
        if (bars.length) return { bars, source: "live" as const, error: null };
      } catch (error) {
        return {
          bars: simulateBars(data.symbol, data.timeframe as Timeframe, data.count),
          source: "simulated" as const,
          error: error instanceof Error ? error.message : "Broker data unavailable",
        };
      }
    }
    return {
      bars: simulateBars(data.symbol, data.timeframe as Timeframe, data.count),
      source: "simulated" as const,
      error: null,
    };
  });

export const getAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const cfg = readConfig();
    if (!cfg) return { configured: false, accounts: [] as unknown[] };
    const res = await searchAccounts(cfg);
    return { configured: true, accounts: res.accounts ?? [] };
  });

export const getPositions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ accountId: z.number().int() }).parse(input))
  .handler(async ({ data }) => {
    const cfg = readConfig();
    if (!cfg) return { configured: false, positions: [] as unknown[] };
    const res = await searchPositions(cfg, data.accountId);
    return { configured: true, positions: res.positions ?? [] };
  });

export const getRecentOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ accountId: z.number().int() }).parse(input))
  .handler(async ({ data }) => {
    const cfg = readConfig();
    if (!cfg) return { configured: false, orders: [] as unknown[] };
    const since = new Date(Date.now() - 7 * 86400_000).toISOString();
    const res = await searchOrders(cfg, data.accountId, since);
    return { configured: true, orders: res.orders ?? [] };
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
    try {
      const res = await placeOrder(cfg, {
        accountId: data.accountId,
        contractId: inst.contractId,
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
      return { ok: true as const, orderId: res.orderId ?? null };
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