export type Bar = {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type Timeframe = "1m" | "5m" | "15m" | "1h" | "1d";

export const TIMEFRAMES: { value: Timeframe; label: string; seconds: number }[] = [
  { value: "1m", label: "1 min", seconds: 60 },
  { value: "5m", label: "5 min", seconds: 300 },
  { value: "15m", label: "15 min", seconds: 900 },
  { value: "1h", label: "1 hour", seconds: 3600 },
  { value: "1d", label: "1 day", seconds: 86400 },
];

export type Instrument = {
  contractId: string;
  symbol: string;
  name: string;
  tickSize: number;
  tickValue: number;
  basePrice: number;
};

export const INSTRUMENTS: Instrument[] = [
  { contractId: "CON.F.US.EP.Z25", symbol: "ES", name: "E-mini S&P 500", tickSize: 0.25, tickValue: 12.5, basePrice: 5620 },
  { contractId: "CON.F.US.ENQ.Z25", symbol: "NQ", name: "E-mini Nasdaq 100", tickSize: 0.25, tickValue: 5, basePrice: 20100 },
  { contractId: "CON.F.US.CL.Z25", symbol: "CL", name: "Crude Oil", tickSize: 0.01, tickValue: 10, basePrice: 74.2 },
  { contractId: "CON.F.US.GC.Z25", symbol: "GC", name: "Gold", tickSize: 0.1, tickValue: 10, basePrice: 2410 },
  { contractId: "CON.F.US.YM.Z25", symbol: "YM", name: "E-mini Dow", tickSize: 1, tickValue: 5, basePrice: 40850 },
];

export function instrumentBySymbol(symbol: string): Instrument {
  return INSTRUMENTS.find((i) => i.symbol === symbol) ?? INSTRUMENTS[0]!;
}

export function timeframeSeconds(tf: Timeframe): number {
  return TIMEFRAMES.find((t) => t.value === tf)?.seconds ?? 300;
}

/**
 * Deterministic pseudo-random bar series. Used when broker credentials are not
 * configured yet, so the chart, indicators and gauge can be validated without
 * touching a live account.
 */
export function simulateBars(symbol: string, tf: Timeframe, count: number, endTime = Date.now()): Bar[] {
  const inst = instrumentBySymbol(symbol);
  const step = timeframeSeconds(tf);
  const end = Math.floor(endTime / 1000 / step) * step;
  let seed = 0;
  for (const ch of `${symbol}:${tf}`) seed = (seed * 31 + ch.charCodeAt(0)) % 2147483647;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const vol = inst.basePrice * 0.0012;
  let price = inst.basePrice;
  const bars: Bar[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const drift = (rand() - 0.5) * vol * 2;
    const trend = Math.sin((count - i) / 18) * vol * 0.6;
    const open = price;
    const close = Math.max(inst.tickSize, open + drift + trend);
    const high = Math.max(open, close) + rand() * vol;
    const low = Math.min(open, close) - rand() * vol;
    price = close;
    const round = (v: number) => Math.round(v / inst.tickSize) * inst.tickSize;
    bars.push({
      time: end - i * step,
      open: round(open),
      high: round(high),
      low: round(low),
      close: round(close),
      volume: Math.round(500 + rand() * 4500),
    });
  }
  return bars;
}