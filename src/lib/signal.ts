import type { Bar, Timeframe } from "./market";
import { macd, momentum, rsi, volumeZScore, vwap } from "./indicators";

export type SignalDirection = "bullish" | "bearish" | "neutral";

export type IndicatorReading = {
  name: string;
  value: number;
  display: string;
  direction: SignalDirection;
  weight: number;
  note: string;
};

export type CompositeSignal = {
  score: number; // -100 (max bearish) to +100 (max bullish)
  direction: SignalDirection;
  label: string;
  readings: IndicatorReading[];
  timeframe: Timeframe;
  lastPrice: number | null;
  barTime: number | null;
};

export type SignalWeights = { rsi: number; vwap: number; macd: number; momentum: number };

export const DEFAULT_WEIGHTS: SignalWeights = { rsi: 1, vwap: 1, macd: 1, momentum: 1 };

const DIRECTION_SCORE: Record<SignalDirection, number> = { bullish: 1, neutral: 0, bearish: -1 };

function classifyRsi(value: number): SignalDirection {
  if (value >= 60) return "bullish";
  if (value <= 40) return "bearish";
  return "neutral";
}

function classifyPriceVsVwap(price: number, vwapValue: number | null): SignalDirection {
  if (vwapValue === null) return "neutral";
  if (price > vwapValue) return "bullish";
  if (price < vwapValue) return "bearish";
  return "neutral";
}

function classifyMacdHist(hist: number): SignalDirection {
  if (hist > 0) return "bullish";
  if (hist < 0) return "bearish";
  return "neutral";
}

function classifyMomentum(value: number, threshold = 0.05): SignalDirection {
  if (value > threshold) return "bullish";
  if (value < -threshold) return "bearish";
  return "neutral";
}

function lastOf<T>(arr: T[]): T | undefined {
  return arr.length ? arr[arr.length - 1] : undefined;
}

export const EMPTY_SIGNAL: CompositeSignal = {
  score: 0,
  direction: "neutral",
  label: "Neutral",
  readings: [],
  timeframe: "5m",
  lastPrice: null,
  barTime: null,
};

/**
 * Weighted vote across indicators — deliberately transparent, so the gauge can
 * always explain itself and weights stay user-tunable.
 */
export function computeSignal(
  bars: Bar[],
  timeframe: Timeframe,
  weights: SignalWeights = DEFAULT_WEIGHTS,
): CompositeSignal {
  if (!bars.length) return { ...EMPTY_SIGNAL, timeframe };

  const closes = bars.map((b) => b.close);
  const lastClose = closes[closes.length - 1]!;
  const lastBarTime = bars[bars.length - 1]!.time;

  const latestRsi = lastOf(rsi(closes, 14)) ?? 50;
  const latestVwap = lastOf(vwap(bars)) ?? null;
  const latestHist = lastOf(macd(closes).histogram) ?? 0;
  const latestMomentum = lastOf(momentum(closes, 10)) ?? null;
  const latestVolZ = lastOf(volumeZScore(bars, 20)) ?? null;

  const readings: IndicatorReading[] = [
    {
      name: "RSI",
      value: latestRsi,
      display: latestRsi.toFixed(1),
      direction: classifyRsi(latestRsi),
      weight: weights.rsi,
      note: latestRsi >= 70 ? "Overbought" : latestRsi <= 30 ? "Oversold" : "In range",
    },
    {
      name: "VWAP",
      value: latestVwap ?? 0,
      display: latestVwap === null ? "—" : latestVwap.toFixed(2),
      direction: classifyPriceVsVwap(lastClose, latestVwap),
      weight: weights.vwap,
      note:
        latestVwap === null
          ? "No volume yet this session"
          : `Price ${lastClose > latestVwap ? "above" : lastClose < latestVwap ? "below" : "at"} session VWAP`,
    },
    {
      name: "MACD",
      value: latestHist,
      display: latestHist.toFixed(3),
      direction: classifyMacdHist(latestHist),
      weight: weights.macd,
      note: latestHist > 0 ? "Histogram positive" : latestHist < 0 ? "Histogram negative" : "Flat",
    },
    {
      name: "Momentum",
      value: latestMomentum ?? 0,
      display: latestMomentum === null ? "—" : `${latestMomentum.toFixed(2)}%`,
      direction: latestMomentum === null ? "neutral" : classifyMomentum(latestMomentum),
      weight: weights.momentum,
      note: latestMomentum === null ? "Not enough bars" : "Rate of change over 10 bars",
    },
  ];

  const totalWeight = readings.reduce((acc, r) => acc + r.weight, 0);
  const weightedSum = readings.reduce((acc, r) => acc + DIRECTION_SCORE[r.direction] * r.weight, 0);
  const score = totalWeight ? Math.round(((weightedSum / totalWeight) * 100) * 10) / 10 : 0;

  const direction: SignalDirection = score >= 20 ? "bullish" : score <= -20 ? "bearish" : "neutral";

  // Volume z-score is shown for context only — it casts no vote.
  readings.push({
    name: "Volume z-score",
    value: latestVolZ ?? 0,
    display: latestVolZ === null ? "—" : latestVolZ.toFixed(2),
    direction: "neutral",
    weight: 0,
    note:
      latestVolZ === null
        ? "Not enough bars"
        : latestVolZ >= 2
          ? "Volume spike"
          : latestVolZ <= -1
            ? "Unusually thin"
            : "Normal participation",
  });

  const strength = Math.abs(score);
  const label =
    direction === "neutral"
      ? "Neutral"
      : `${strength >= 75 ? "Strong " : strength >= 45 ? "" : "Weak "}${direction === "bullish" ? "Bullish" : "Bearish"}`;

  return { score, direction, label, readings, timeframe, lastPrice: lastClose, barTime: lastBarTime };
}