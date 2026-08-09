export type RiskLimits = {
  dailyLossLimit: number;
  maxTradesPerDay: number;
  maxConsecutiveLosses: number;
  maxPositionSize: number;
  killSwitchArmed: boolean;
};

export type DailyState = {
  tradingDate: string; // YYYY-MM-DD
  realizedPnl: number;
  tradesCount: number;
  consecutiveLosses: number;
};

export type RiskCheck = { allowed: true } | { allowed: false; reason: string };

export const DEFAULT_LIMITS: RiskLimits = {
  dailyLossLimit: 500,
  maxTradesPerDay: 10,
  maxConsecutiveLosses: 3,
  maxPositionSize: 2,
  killSwitchArmed: false,
};

export function todayKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/**
 * Client-side pre-trade guardrails. Topstep's own rule engine also rejects
 * violating orders, but only after the order is sent — this gives the trader a
 * clear reason first, and lets each user set limits tighter than the firm's.
 */
export function checkPreTrade(
  limits: RiskLimits,
  state: DailyState,
  requestedSize: number,
  supervised = true,
): RiskCheck {
  if (limits.killSwitchArmed) {
    return { allowed: false, reason: "Kill switch is armed — trading is manually disabled." };
  }
  if (!supervised) {
    return {
      allowed: false,
      reason: "Session is unattended. Topstep requires supervised execution — return to the tab to re-arm.",
    };
  }
  if (state.tradingDate !== todayKey()) {
    return { allowed: false, reason: "Daily state is stale — reload to rebuild today's risk state." };
  }
  if (state.realizedPnl <= -Math.abs(limits.dailyLossLimit)) {
    return {
      allowed: false,
      reason: `Daily loss limit reached: ${state.realizedPnl.toFixed(2)} of -${Math.abs(limits.dailyLossLimit).toFixed(2)}.`,
    };
  }
  if (state.tradesCount >= limits.maxTradesPerDay) {
    return {
      allowed: false,
      reason: `Max trades per day reached: ${state.tradesCount}/${limits.maxTradesPerDay}.`,
    };
  }
  if (state.consecutiveLosses >= limits.maxConsecutiveLosses) {
    return {
      allowed: false,
      reason: `Loss streak limit reached: ${state.consecutiveLosses}/${limits.maxConsecutiveLosses} consecutive losses.`,
    };
  }
  if (requestedSize > limits.maxPositionSize) {
    return {
      allowed: false,
      reason: `Requested size ${requestedSize} exceeds your max position size of ${limits.maxPositionSize}.`,
    };
  }
  return { allowed: true };
}

export function recordTradeResult(state: DailyState, pnl: number): DailyState {
  return {
    ...state,
    realizedPnl: state.realizedPnl + pnl,
    tradesCount: state.tradesCount + 1,
    consecutiveLosses: pnl < 0 ? state.consecutiveLosses + 1 : 0,
  };
}

/** Rebuilds today's state from closed trades so a reload never resets the counters. */
export function dailyStateFromTrades(
  closed: { pnl: number | null; exit_time: string | null }[],
  now = new Date(),
): DailyState {
  const day = todayKey(now);
  const todays = closed
    .filter((t) => t.exit_time && todayKey(new Date(t.exit_time)) === day && t.pnl !== null)
    .sort((a, b) => new Date(a.exit_time!).getTime() - new Date(b.exit_time!).getTime());

  let consecutiveLosses = 0;
  for (let i = todays.length - 1; i >= 0; i--) {
    if (Number(todays[i]!.pnl) < 0) consecutiveLosses++;
    else break;
  }

  return {
    tradingDate: day,
    realizedPnl: todays.reduce((acc, t) => acc + Number(t.pnl), 0),
    tradesCount: todays.length,
    consecutiveLosses,
  };
}