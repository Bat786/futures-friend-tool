import { describe, expect, it } from "vitest";
import { ema, macd, momentum, rsi, sma, volumeZScore, vwap } from "../indicators";
import { computeSignal, DEFAULT_WEIGHTS } from "../signal";
import type { Bar } from "../market";

/**
 * Parity fixtures: the same synthetic uptrend the Python reference uses —
 * closes 100, 101, ... so pandas and these implementations can be compared
 * directly.
 */
const closes = Array.from({ length: 40 }, (_, i) => 100 + i);

// Session-aligned: all bars sit inside one UTC day so session VWAP never resets.
const SESSION_START = Math.floor(Date.UTC(2024, 0, 15, 14, 30) / 1000);

const bars: Bar[] = closes.map((c, i) => ({
  time: SESSION_START + i * 300,
  open: c - 0.5,
  high: c + 0.5,
  low: c - 1,
  close: c,
  volume: 1000,
}));

const near = (a: number | null, b: number, tol = 1e-6) => {
  expect(a).not.toBeNull();
  expect(Math.abs((a as number) - b)).toBeLessThan(tol);
};

const last = <T,>(arr: T[]) => arr[arr.length - 1]!;

describe("sma", () => {
  it("matches rolling(window).mean()", () => {
    const out = sma(closes, 5);
    expect(out.slice(0, 4).every((v) => v === null)).toBe(true);
    near(out[4]!, 102); // mean(100..104)
    near(last(out)!, 137); // mean(135..139)
  });
});

describe("ema", () => {
  it("matches pandas ewm(span, adjust=False)", () => {
    // ewm seeds with the first value, then alpha = 2/(span+1).
    const span = 5;
    const alpha = 2 / (span + 1);
    let expected = closes[0]!;
    for (let i = 1; i < closes.length; i++) expected = alpha * closes[i]! + (1 - alpha) * expected;
    near(last(ema(closes, span)), expected);
  });
});

describe("rsi", () => {
  it("falls back to neutral 50 when there are no down closes, matching pandas fillna(50)", () => {
    near(last(rsi(closes, 14))!, 50, 1e-9);
  });

  it("is above 60 on a mostly-up series with occasional pullbacks", () => {
    const mixed = closes.map((c, i) => (i % 7 === 0 ? c - 2 : c));
    expect(last(rsi(mixed, 14))!).toBeGreaterThan(60);
  });

  it("is below 40 on a mostly-down series", () => {
    const down = [...closes].reverse().map((c, i) => (i % 7 === 0 ? c + 2 : c));
    expect(last(rsi(down, 14))!).toBeLessThan(40);
  });

  it("sits near 50 on a flat series", () => {
    const flat = Array.from({ length: 40 }, () => 100);
    const value = last(rsi(flat, 14));
    expect(value === null || Math.abs(value - 50) < 1e-6 || Number.isNaN(value)).toBe(true);
  });
});

describe("macd", () => {
  it("has a positive histogram on a steady uptrend", () => {
    const { macdLine, signalLine, histogram } = macd(closes);
    expect(last(macdLine)!).toBeGreaterThan(0);
    near(last(histogram)!, last(macdLine)! - last(signalLine)!, 1e-9);
  });

  it("has a negative histogram on a steady downtrend", () => {
    expect(last(macd([...closes].reverse()).histogram)!).toBeLessThan(0);
  });
});

describe("vwap", () => {
  it("equals cumulative typical-price volume weighting", () => {
    const out = vwap(bars);
    let pv = 0;
    let vol = 0;
    for (const b of bars) {
      const typical = (b.high + b.low + b.close) / 3;
      pv += typical * b.volume;
      vol += b.volume;
    }
    near(last(out), pv / vol);
  });

  it("trails price in an uptrend", () => {
    expect(last(vwap(bars))!).toBeLessThan(last(bars).close);
  });
});

describe("momentum", () => {
  it("is the percent rate of change over the lookback", () => {
    const out = momentum(closes, 10);
    const expected = ((last(closes) - closes[closes.length - 11]!) / closes[closes.length - 11]!) * 100;
    near(last(out), expected);
  });
});

describe("volumeZScore", () => {
  it("is 0 (or null) when volume never varies", () => {
    const value = last(volumeZScore(bars, 20));
    expect(value === null || value === 0).toBe(true);
  });

  it("flags a spike above 2 sigma", () => {
    const spiked = bars.map((b, i) => (i === bars.length - 1 ? { ...b, volume: 9000 } : { ...b, volume: 1000 + (i % 3) * 10 }));
    expect(last(volumeZScore(spiked, 20))!).toBeGreaterThan(2);
  });
});

describe("computeSignal", () => {
  it("returns a strongly bullish composite on the uptrend fixture", () => {
    const signal = computeSignal(bars, "5m", DEFAULT_WEIGHTS);
    expect(signal.direction).toBe("bullish");
    expect(signal.score).toBeGreaterThanOrEqual(75);
    expect(signal.lastPrice).toBe(last(closes));
  });

  it("returns a bearish composite on the mirrored downtrend", () => {
    const down = bars.map((b, i) => ({ ...b, close: closes[closes.length - 1 - i]!, open: closes[closes.length - 1 - i]! }));
    const signal = computeSignal(down, "5m", DEFAULT_WEIGHTS);
    expect(signal.direction).toBe("bearish");
    expect(signal.score).toBeLessThanOrEqual(-20);
  });

  it("respects user weights — muting every voter yields a neutral score", () => {
    const signal = computeSignal(bars, "5m", { rsi: 0, vwap: 0, macd: 0, momentum: 0 });
    expect(signal.score).toBe(0);
    expect(signal.direction).toBe("neutral");
  });

  it("weighted score is the weighted mean of the individual votes", () => {
    const weights = { rsi: 2, vwap: 1, macd: 0.5, momentum: 0 };
    const signal = computeSignal(bars, "5m", weights);
    const voters = signal.readings.filter((r) => r.weight > 0);
    const score = { bullish: 1, neutral: 0, bearish: -1 } as const;
    const total = voters.reduce((a, r) => a + r.weight, 0);
    const weighted = voters.reduce((a, r) => a + score[r.direction] * r.weight, 0);
    near(signal.score, Math.round((weighted / total) * 1000) / 10, 0.051);
  });

  it("is empty and neutral with no bars", () => {
    const signal = computeSignal([], "5m");
    expect(signal.score).toBe(0);
    expect(signal.readings).toHaveLength(0);
  });
});
