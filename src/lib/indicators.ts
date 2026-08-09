import type { Bar } from "./market";

export function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i]!;
    if (i >= period) sum -= values[i - period]!;
    out.push(i >= period - 1 ? sum / period : null);
  }
  return out;
}

/**
 * pandas `Series.ewm(alpha=..., adjust=False).mean()` — recursive smoothing
 * seeded from the first value, emitting from bar 0.
 */
export function ewm(values: number[], alpha: number): number[] {
  const out: number[] = [];
  let prev: number | null = null;
  for (const v of values) {
    prev = prev === null ? v : alpha * v + (1 - alpha) * prev;
    out.push(prev);
  }
  return out;
}

/** `ewm(span=period, adjust=False)`: alpha = 2 / (span + 1). */
export function ema(values: number[], period: number): number[] {
  return ewm(values, 2 / (period + 1));
}

/**
 * Wilder RSI via `ewm(alpha=1/period, adjust=False)`.
 * Returns 50 (neutral) wherever the value is undefined, matching `.fillna(50)`.
 */
export function rsi(closes: number[], period = 14): number[] {
  if (closes.length === 0) return [];
  const gains: number[] = [0];
  const losses: number[] = [0];
  for (let i = 1; i < closes.length; i++) {
    const delta = closes[i]! - closes[i - 1]!;
    gains.push(Math.max(delta, 0));
    losses.push(Math.max(-delta, 0));
  }
  const alpha = 1 / period;
  const avgGain = ewm(gains, alpha);
  const avgLoss = ewm(losses, alpha);
  return closes.map((_, i) => {
    // min_periods=period: undefined before the window fills, and where there
    // are no losses at all the RS is undefined too — both read as neutral.
    if (i < period) return 50;
    const loss = avgLoss[i]!;
    if (loss === 0) return 50;
    const rs = avgGain[i]! / loss;
    return 100 - 100 / (1 + rs);
  });
}

export function macd(closes: number[], fast = 12, slow = 26, signalPeriod = 9) {
  const fastLine = ema(closes, fast);
  const slowLine = ema(closes, slow);
  const macdLine = closes.map((_, i) => fastLine[i]! - slowLine[i]!);
  const signalLine = ema(macdLine, signalPeriod);
  const histogram = macdLine.map((v, i) => v - signalLine[i]!);
  return { macdLine, signalLine, histogram };
}

/** Session VWAP, restarted whenever the calendar day changes. */
export function vwap(bars: Bar[]): (number | null)[] {
  const out: (number | null)[] = [];
  let cumPV = 0;
  let cumVol = 0;
  let currentDay = "";
  for (const bar of bars) {
    const day = new Date(bar.time * 1000).toISOString().slice(0, 10);
    if (day !== currentDay) {
      currentDay = day;
      cumPV = 0;
      cumVol = 0;
    }
    const typical = (bar.high + bar.low + bar.close) / 3;
    cumPV += typical * bar.volume;
    cumVol += bar.volume;
    out.push(cumVol > 0 ? cumPV / cumVol : null);
  }
  return out;
}

/** Simple rate-of-change momentum: % change over `period` bars. */
export function momentum(closes: number[], period = 10): (number | null)[] {
  return closes.map((c, i) => {
    if (i < period) return null;
    const past = closes[i - period]!;
    return past === 0 ? null : ((c - past) / past) * 100;
  });
}

/** How unusual current volume is vs its rolling mean — flags momentum spikes. */
export function volumeZScore(bars: Bar[], window = 20): (number | null)[] {
  const volumes = bars.map((b) => b.volume);
  return volumes.map((v, i) => {
    if (i < window - 1) return null;
    const slice = volumes.slice(i - window + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / window;
    // pandas rolling().std() defaults to the sample (ddof=1) deviation.
    const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / (window - 1);
    const std = Math.sqrt(variance);
    return std === 0 ? null : (v - mean) / std;
  });
}