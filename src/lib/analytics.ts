export type JournalTrade = {
  id: string;
  symbol: string;
  side: string;
  size: number;
  entry_price: number | null;
  exit_price: number | null;
  entry_time: string;
  exit_time: string | null;
  fees: number;
  pnl: number | null;
  pnl_r_multiple: number | null;
  stop_price: number | null;
  target_price: number | null;
  setup_tag: string | null;
  status: string;
  notes: string | null;
  is_backtest: boolean;
};

const pnls = (trades: JournalTrade[]) =>
  trades.filter((t) => t.pnl !== null).map((t) => Number(t.pnl));

export function winRate(trades: JournalTrade[]): number | null {
  const p = pnls(trades);
  if (!p.length) return null;
  return p.filter((v) => v > 0).length / p.length;
}

export function avgWinLoss(trades: JournalTrade[]) {
  const p = pnls(trades);
  const wins = p.filter((v) => v > 0);
  const losses = p.filter((v) => v < 0);
  const mean = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
  return {
    avgWin: mean(wins),
    avgLoss: mean(losses),
    winCount: wins.length,
    lossCount: losses.length,
  };
}

/** Average P&L per trade — the single number for "is this profitable". */
export function expectancy(trades: JournalTrade[]): number | null {
  const p = pnls(trades);
  if (!p.length) return null;
  return p.reduce((a, b) => a + b, 0) / p.length;
}

export function netPnl(trades: JournalTrade[]): number {
  return pnls(trades).reduce((a, b) => a + b, 0);
}

export function avgRMultiple(trades: JournalTrade[]): number | null {
  const r = trades.filter((t) => t.pnl_r_multiple !== null).map((t) => Number(t.pnl_r_multiple));
  if (!r.length) return null;
  return r.reduce((a, b) => a + b, 0) / r.length;
}

export function pnlBySetup(trades: JournalTrade[]) {
  const groups = new Map<string, JournalTrade[]>();
  for (const t of trades) {
    const key = t.setup_tag || "untagged";
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  return [...groups.entries()]
    .map(([setup, group]) => ({
      setup,
      tradeCount: group.length,
      netPnl: netPnl(group),
      winRate: winRate(group),
      expectancy: expectancy(group),
    }))
    .sort((a, b) => b.netPnl - a.netPnl);
}

export function pnlByHourOfDay(trades: JournalTrade[]) {
  const groups = new Map<number, JournalTrade[]>();
  for (const t of trades) {
    const hour = new Date(t.entry_time).getHours();
    groups.set(hour, [...(groups.get(hour) ?? []), t]);
  }
  return [...groups.entries()]
    .map(([hour, group]) => ({
      hour,
      label: `${String(hour).padStart(2, "0")}:00`,
      tradeCount: group.length,
      netPnl: netPnl(group),
      winRate: winRate(group),
    }))
    .sort((a, b) => a.hour - b.hour);
}

export function equityCurve(trades: JournalTrade[]) {
  const sorted = [...trades]
    .filter((t) => t.pnl !== null)
    .sort(
      (a, b) =>
        new Date(a.exit_time ?? a.entry_time).getTime() -
        new Date(b.exit_time ?? b.entry_time).getTime(),
    );
  let running = 0;
  let peak = 0;
  return sorted.map((t, i) => {
    running += Number(t.pnl);
    peak = Math.max(peak, running);
    return {
      index: i + 1,
      time: t.exit_time ?? t.entry_time,
      label: new Date(t.exit_time ?? t.entry_time).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      cumulativePnl: Number(running.toFixed(2)),
      drawdown: Number((running - peak).toFixed(2)),
    };
  });
}

export function maxDrawdown(trades: JournalTrade[]): number | null {
  const curve = equityCurve(trades);
  if (!curve.length) return null;
  return Math.abs(Math.min(0, ...curve.map((p) => p.drawdown)));
}

export function summary(trades: JournalTrade[]) {
  return {
    tradeCount: trades.length,
    winRate: winRate(trades),
    expectancy: expectancy(trades),
    netPnl: netPnl(trades),
    maxDrawdown: maxDrawdown(trades),
    avgR: avgRMultiple(trades),
    ...avgWinLoss(trades),
  };
}

/** Net P&L after fees, from the entry/exit of a single trade. */
export function computePnl(
  side: string,
  size: number,
  entryPrice: number,
  exitPrice: number,
  tickSize: number,
  tickValue: number,
  fees = 0,
): number {
  const direction = side === "buy" ? 1 : -1;
  const ticks = (direction * (exitPrice - entryPrice)) / tickSize;
  return Number((ticks * tickValue * size - fees).toFixed(2));
}

/** R multiple = realized P&L divided by the risk taken at entry. */
export function computeRMultiple(
  side: string,
  size: number,
  entryPrice: number,
  stopPrice: number | null,
  pnl: number,
  tickSize: number,
  tickValue: number,
): number | null {
  if (stopPrice === null) return null;
  const riskTicks = Math.abs(entryPrice - stopPrice) / tickSize;
  const risk = riskTicks * tickValue * size;
  if (!risk) return null;
  return Number((pnl / risk).toFixed(3));
}