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

export function ema(values: number[], period: number): (number | null)[] {
  const k = 2 / (period + 1);
  const out: (number | null)[] = [];
  let prev: number | null = null;
  for (let i = 0; i < values.length; i++) {
    const v = values[i]!;
    prev = prev === null ? v : v * k + prev * (1 - k);
    out.push(i >= period - 1 ? prev : null);
  }
  return out;
}

export function rsi(closes: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = [null];
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i < closes.length; i++) {
    const change = closes[i]! - closes[i - 1]!;
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);
    if (i <= period) {
      avgGain += gain / period;
      avgLoss += loss / period;
      out.push(i === period ? computeRsi(avgGain, avgLoss) : null);
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      out.push(computeRsi(avgGain, avgLoss));
    }
  }
  return out;
}

function computeRsi(avgGain: number, avgLoss: number): number {
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function macd(closes: number[], fast = 12, slow = 26, signalPeriod = 9) {
  const fastLine = ema(closes, fast);
  const slowLine = ema(closes, slow);
  const macdLine = closes.map((_, i) => {
    const f = fastLine[i];
    const s = slowLine[i];
    return f !== null && s !== null && f !== undefined && s !== undefined ? f - s : null;
  });
  const filled = macdLine.map((v) => v ?? 0);
  const signalLine = ema(filled, signalPeriod);
  const histogram = macdLine.map((v, i) => {
    const s = signalLine[i];
    return v !== null && s !== null && s !== undefined ? v - s : null;
  });
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

/** Rate of change over `period` bars, as a percentage. */
export function momentum(closes: number[], period = 10): (number | null)[] {
  return closes.map((c, i) => {
    if (i < period) return null;
    const past = closes[i - period]!;
    return past === 0 ? null : ((c - past) / past) * 100;
  });
}

/** Current volume relative to its own moving average (1 = average). */
export function relativeVolume(bars: Bar[], period = 20): (number | null)[] {
  const avg = sma(bars.map((b) => b.volume), period);
  return bars.map((b, i) => {
    const a = avg[i];
    return a ? b.volume / a : null;
  });
}