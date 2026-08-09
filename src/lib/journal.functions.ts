import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { toJournalTrade } from "./journal-map";
import { computePnl, computeRMultiple, type JournalTrade } from "./analytics";
import { instrumentBySymbol } from "./market";
import { dailyStateFromTrades, type DailyState, type RiskLimits } from "./risk";

const tradeInput = z.object({
  id: z.string().uuid().optional(),
  symbol: z.string().min(1),
  side: z.enum(["buy", "sell"]),
  size: z.number().int().min(1).max(100),
  entry_price: z.number().nullable(),
  exit_price: z.number().nullable(),
  entry_time: z.string(),
  exit_time: z.string().nullable(),
  fees: z.number().min(0).default(0),
  stop_price: z.number().nullable(),
  target_price: z.number().nullable(),
  setup_tag: z.string().max(60).nullable(),
  notes: z.string().max(4000).nullable(),
  is_backtest: z.boolean().default(false),
  account_id: z.string().nullable().optional(),
});

export const listTrades = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("trades")
      .select("*")
      .eq("user_id", context.userId)
      .order("entry_time", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    return { trades: (data ?? []).map(toJournalTrade) as JournalTrade[] };
  });

export const saveTrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => tradeInput.parse(input))
  .handler(async ({ data, context }) => {
    const inst = instrumentBySymbol(data.symbol);
    const closed = data.exit_price !== null && data.entry_price !== null;
    const pnl = closed
      ? computePnl(data.side, data.size, data.entry_price!, data.exit_price!, inst.tickSize, inst.tickValue, data.fees)
      : null;
    const rMultiple =
      closed && pnl !== null
        ? computeRMultiple(data.side, data.size, data.entry_price!, data.stop_price, pnl, inst.tickSize, inst.tickValue)
        : null;

    const row = {
      user_id: context.userId,
      contract_id: inst.contractId,
      symbol: data.symbol,
      side: data.side,
      size: data.size,
      entry_price: data.entry_price,
      exit_price: data.exit_price,
      entry_time: data.entry_time,
      exit_time: closed ? (data.exit_time ?? new Date().toISOString()) : null,
      fees: data.fees,
      pnl,
      pnl_r_multiple: rMultiple,
      stop_price: data.stop_price,
      target_price: data.target_price,
      setup_tag: data.setup_tag,
      notes: data.notes,
      is_backtest: data.is_backtest,
      account_id: data.account_id ?? null,
      status: closed ? "closed" : "open",
    };

    const query = data.id
      ? context.supabase.from("trades").update(row).eq("id", data.id).eq("user_id", context.userId).select("*").single()
      : context.supabase.from("trades").insert(row).select("*").single();

    const { data: saved, error } = await query;
    if (error) throw new Error(error.message);
    return { trade: toJournalTrade(saved) };
  });

export const deleteTrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("trades")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getRiskState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: settings } = await context.supabase
      .from("risk_settings")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();

    const { data: closed } = await context.supabase
      .from("trades")
      .select("pnl, exit_time")
      .eq("user_id", context.userId)
      .eq("status", "closed")
      .eq("is_backtest", false)
      .not("exit_time", "is", null);

    const limits: RiskLimits = {
      dailyLossLimit: Number(settings?.daily_loss_limit ?? 500),
      maxTradesPerDay: settings?.max_trades_per_day ?? 10,
      maxConsecutiveLosses: settings?.max_consecutive_losses ?? 3,
      maxPositionSize: settings?.max_position_size ?? 2,
      killSwitchArmed: settings?.kill_switch_armed ?? false,
    };

    const state: DailyState = dailyStateFromTrades(
      (closed ?? []).map((t) => ({ pnl: t.pnl === null ? null : Number(t.pnl), exit_time: t.exit_time })),
    );

    const defaults = {
      defaultStopTicks: settings?.default_stop_ticks ?? 20,
      defaultTargetTicks: settings?.default_target_ticks ?? 40,
    };

    const weights = {
      rsi: Number(settings?.weight_rsi ?? 1),
      vwap: Number(settings?.weight_vwap ?? 1),
      macd: Number(settings?.weight_macd ?? 1),
      momentum: Number(settings?.weight_momentum ?? 1),
    };

    return { limits, state, defaults, weights };
  });

export const updateRiskSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        daily_loss_limit: z.number().min(0).max(100000),
        max_trades_per_day: z.number().int().min(1).max(200),
        max_consecutive_losses: z.number().int().min(1).max(50),
        max_position_size: z.number().int().min(1).max(50),
        default_stop_ticks: z.number().int().min(1).max(2000),
        default_target_ticks: z.number().int().min(1).max(4000),
        kill_switch_armed: z.boolean(),
        weight_rsi: z.number().min(0).max(3),
        weight_vwap: z.number().min(0).max(3),
        weight_macd: z.number().min(0).max(3),
        weight_momentum: z.number().min(0).max(3),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("risk_settings")
      .upsert({ ...data, user_id: context.userId }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const orderEntryInput = z.object({
  accountId: z.number().int(),
  symbol: z.string().min(1),
  side: z.number().int(),
  size: z.number().int().min(1),
  entryPrice: z.number().nullable(),
  orderType: z.number().int(),
  stopLossTicks: z.number().int().min(1),
  takeProfitTicks: z.number().int().min(1),
  setupTag: z.string().max(60).nullable(),
  supervised: z.boolean().default(false),
  snapshot: z.object({
    rsi: z.number().nullable(),
    vwap: z.number().nullable(),
    macd: z.number().nullable(),
    momentum: z.number().nullable(),
    score: z.number().nullable(),
  }),
});

/** Persist a trade entry after it has been successfully executed from the user's device. */
export const logOrderEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => orderEntryInput.parse(input))
  .handler(async ({ data, context }) => {
    const inst = instrumentBySymbol(data.symbol);
    const side = data.side === 1 ? "buy" : "sell";
    const entryPrice = data.entryPrice;
    const stopTicks = data.stopLossTicks * inst.tickSize;
    const targetTicks = data.takeProfitTicks * inst.tickSize;
    const stopPrice = entryPrice !== null ? (side === "buy" ? entryPrice - stopTicks : entryPrice + stopTicks) : null;
    const targetPrice = entryPrice !== null ? (side === "buy" ? entryPrice + targetTicks : entryPrice - targetTicks) : null;
    const now = new Date().toISOString();

    const tradeRow = {
      user_id: context.userId,
      account_id: String(data.accountId),
      contract_id: inst.contractId,
      symbol: data.symbol,
      side,
      size: data.size,
      entry_price: entryPrice,
      exit_price: null,
      entry_time: now,
      exit_time: null,
      fees: 0,
      pnl: null,
      pnl_r_multiple: null,
      stop_price: stopPrice,
      target_price: targetPrice,
      setup_tag: data.setupTag,
      notes: data.supervised ? "Sent from supervised device session." : "Sent from unattended session.",
      is_backtest: false,
      status: "open",
    };

    const { data: saved, error: tradeError } = await context.supabase
      .from("trades")
      .insert(tradeRow)
      .select("*")
      .single();
    if (tradeError) throw new Error(tradeError.message);

    const signalRows = [
      { user_id: context.userId, trade_id: saved.id, indicator_name: "rsi", value_at_entry: data.snapshot.rsi },
      { user_id: context.userId, trade_id: saved.id, indicator_name: "vwap", value_at_entry: data.snapshot.vwap },
      { user_id: context.userId, trade_id: saved.id, indicator_name: "macd", value_at_entry: data.snapshot.macd },
      { user_id: context.userId, trade_id: saved.id, indicator_name: "momentum", value_at_entry: data.snapshot.momentum },
      { user_id: context.userId, trade_id: saved.id, indicator_name: "score", value_at_entry: data.snapshot.score },
    ].filter((r) => r.value_at_entry !== null);

    if (signalRows.length) {
      const { error: signalError } = await context.supabase.from("signals").insert(signalRows);
      if (signalError) throw new Error(signalError.message);
    }

    return { trade: toJournalTrade(saved) };
  });