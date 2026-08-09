import type { Bar, Timeframe } from "./market";
import { ema, macd, momentum, relativeVolume, rsi, vwap } from "./indicators";

export type SignalDirection = "bullish" | "bearish" | "neutral";

export type IndicatorReading = {
  name: string;
  value: number | null;
  display: string;
  score: number; // -100..100 contribution before weighting
  weight: number;
  direction: SignalDirection;
  note: string;
};

export type CompositeSignal = {
  score: number; // -100..100
  direction: SignalDirection;
  label: string;
  readings: IndicatorReading[];
  timeframe: Timeframe;
  lastPrice: number | null;
};

function last<T>(arr: (T | null)[]): T | null {
  for (let i = arr.length - 1; i >= 0; i--) {
    const v = arr[i];
    if (v !== null && v !== undefined) return v;
  }
  return null;
}

function dirOf(score: number): SignalDirection {
  if (score > 15) return "bullish";
  if (score < -15) return "bearish";
  return "neutral";
}

function clamp(v: number, min = -100, max = 100) {
  return Math.max(min, Math.min(max, v));
}

export function computeSignal(bars: Bar[], timeframe: Timeframe): CompositeSignal {
  const closes = bars.map((b) => b.close);
  const lastPrice = closes.length ? closes[closes.length - 1]! : null;

  const rsiValue = last(rsi(closes, 14));
  const vwapValue = last(vwap(bars));
  const { histogram } = macd(closes);
  const macdValue = last(histogram);
  const momValue = last(momentum(closes, 10));
  const rvolValue = last(relativeVolume(bars, 20));
  const emaFast = last(ema(closes, 9));
  const emaSlow = last(ema(closes, 21));

  const readings: IndicatorReading[] = [];

  {
    const score = rsiValue === null ? 0 : clamp((rsiValue - 50) * 2.4);
    readings.push({
      name: "RSI (14)",
      value: rsiValue,
      display: rsiValue === null ? "—" : rsiValue.toFixed(1),
      score,
      weight: 0.22,
      direction: dirOf(score),
      note:
        rsiValue === null
          ? "Not enough bars"
          : rsiValue > 70
            ? "Overbought"
            : rsiValue < 30
              ? "Oversold"
              : "In range",
    });
  }

  {
    const pct =
      vwapValue && lastPrice ? ((lastPrice - vwapValue) / vwapValue) * 100 : null;
    const score = pct === null ? 0 : clamp(pct * 60);
    readings.push({
      name: "VWAP",
      value: vwapValue,
      display: vwapValue === null ? "—" : vwapValue.toFixed(2),
      score,
      weight: 0.24,
      direction: dirOf(score),
      note: pct === null ? "Not enough bars" : `${pct >= 0 ? "Above" : "Below"} by ${Math.abs(pct).toFixed(2)}%`,
    });
  }

  {
    const norm = macdValue !== null && lastPrice ? (macdValue / lastPrice) * 100 : null;
    const score = norm === null ? 0 : clamp(norm * 220);
    readings.push({
      name: "MACD histogram",
      value: macdValue,
      display: macdValue === null ? "—" : macdValue.toFixed(3),
      score,
      weight: 0.22,
      direction: dirOf(score),
      note: macdValue === null ? "Not enough bars" : macdValue >= 0 ? "Momentum expanding" : "Momentum fading",
    });
  }

  {
    const score = momValue === null ? 0 : clamp(momValue * 45);
    readings.push({
      name: "Momentum (10)",
      value: momValue,
      display: momValue === null ? "—" : `${momValue.toFixed(2)}%`,
      score,
      weight: 0.16,
      direction: dirOf(score),
      note: momValue === null ? "Not enough bars" : momValue >= 0 ? "Higher than 10 bars ago" : "Lower than 10 bars ago",
    });
  }

  {
    const trend = emaFast !== null && emaSlow !== null ? emaFast - emaSlow : null;
    const score = trend === null || !lastPrice ? 0 : clamp((trend / lastPrice) * 100 * 260);
    readings.push({
      name: "EMA 9 / 21",
      value: trend,
      display: emaFast === null || emaSlow === null ? "—" : `${emaFast.toFixed(2)} / ${emaSlow.toFixed(2)}`,
      score,
      weight: 0.16,
      direction: dirOf(score),
      note: trend === null ? "Not enough bars" : trend >= 0 ? "Fast above slow" : "Fast below slow",
    });
  }

  // Relative volume does not pick a side; it scales conviction.
  const conviction = rvolValue === null ? 1 : Math.max(0.6, Math.min(1.3, rvolValue));

  const weighted = readings.reduce((acc, r) => acc + r.score * r.weight, 0);
  const score = Math.round(clamp(weighted * conviction));

  readings.push({
    name: "Relative volume",
    value: rvolValue,
    display: rvolValue === null ? "—" : `${rvolValue.toFixed(2)}x`,
    score: 0,
    weight: 0,
    direction: "neutral",
    note:
      rvolValue === null
        ? "Not enough bars"
        : rvolValue >= 1.2
          ? "Above average — conviction boosted"
          : rvolValue <= 0.8
            ? "Thin volume — conviction reduced"
            : "Around average",
  });

  const direction = dirOf(score);
  const strength = Math.abs(score);
  const label =
    direction === "neutral"
      ? "Neutral"
      : `${strength > 60 ? "Strong " : strength > 30 ? "" : "Weak "}${direction === "bullish" ? "Bullish" : "Bearish"}`;

  return { score, direction, label, readings, timeframe, lastPrice };
}