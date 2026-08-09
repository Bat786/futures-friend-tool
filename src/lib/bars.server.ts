import { instrumentBySymbol, simulateBars, timeframeSeconds, type Bar, type Timeframe } from "./market";
import { readConfig, retrieveBars, timeframeToUnit } from "./topstepx.server";

export type BarsResult = {
  bars: Bar[];
  source: "live" | "simulated";
  error: string | null;
};

/**
 * Single place where ProjectX's t/o/h/l/c/v bar shape is mapped onto ours.
 * Falls back to deterministic simulated bars when credentials are absent or
 * the gateway is unreachable, so the signal path is always testable.
 */
export async function fetchBars(
  symbol: string,
  timeframe: Timeframe,
  count: number,
): Promise<BarsResult> {
  const inst = instrumentBySymbol(symbol);
  const cfg = readConfig();
  if (!cfg) return { bars: simulateBars(symbol, timeframe, count), source: "simulated", error: null };

  try {
    const { unit, unitNumber } = timeframeToUnit(timeframe);
    const end = new Date();
    const start = new Date(end.getTime() - timeframeSeconds(timeframe) * 1000 * count * 3);
    const res = await retrieveBars(cfg, {
      contractId: inst.contractId,
      unit,
      unitNumber,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      limit: count,
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
    if (bars.length) return { bars, source: "live", error: null };
    return { bars: simulateBars(symbol, timeframe, count), source: "simulated", error: "Gateway returned no bars" };
  } catch (error) {
    return {
      bars: simulateBars(symbol, timeframe, count),
      source: "simulated",
      error: error instanceof Error ? error.message : "Broker data unavailable",
    };
  }
}