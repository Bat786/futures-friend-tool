import { describe, expect, it } from "vitest";
import { computePnl, computeRMultiple, expectancy, maxDrawdown, winRate, type JournalTrade } from "../analytics";
import { checkPreTrade, DEFAULT_LIMITS, todayKey, type DailyState } from "../risk";
import { __test as contractTest } from "../broker-client";

const trade = (over: Partial<JournalTrade>): JournalTrade => ({
  id: crypto.randomUUID(),
  symbol: "MES",
  side: "buy",
  size: 1,
  entry_price: 5000,
  exit_price: 5010,
  entry_time: new Date().toISOString(),
  exit_time: new Date().toISOString(),
  fees: 0,
  pnl: 50,
  pnl_r_multiple: 1,
  stop_price: 4990,
  target_price: 5020,
  setup_tag: null,
  status: "closed",
  notes: null,
  is_backtest: false,
  ...over,
});

describe("computePnl", () => {
  it("prices a winning MES long in ticks", () => {
    // 40 ticks * $1.25 * 2 contracts = $100
    expect(computePnl("buy", 2, 5000, 5010, 0.25, 1.25)).toBe(100);
  });

  it("inverts for shorts and subtracts fees", () => {
    expect(computePnl("sell", 1, 5010, 5000, 0.25, 1.25, 2.5)).toBe(47.5);
  });
});

describe("computeRMultiple", () => {
  it("is +2R when the win is twice the risk", () => {
    // risk = 10 pts = 40 ticks * 1.25 = $50, pnl 100 -> 2R
    expect(computeRMultiple("buy", 1, 5000, 4990, 100, 0.25, 1.25)).toBe(2);
  });

  it("is null without a stop", () => {
    expect(computeRMultiple("buy", 1, 5000, null, 100, 0.25, 1.25)).toBeNull();
  });
});

describe("analytics", () => {
  const trades = [trade({ pnl: 100 }), trade({ pnl: -50 }), trade({ pnl: 25 })];
  it("computes win rate and expectancy", () => {
    expect(winRate(trades)).toBeCloseTo(2 / 3);
    expect(expectancy(trades)).toBeCloseTo(25);
  });
  it("computes max drawdown from the equity curve", () => {
    expect(maxDrawdown(trades)).toBe(50);
  });
});

describe("risk gate", () => {
  const state: DailyState = { tradingDate: todayKey(), realizedPnl: 0, tradesCount: 0, consecutiveLosses: 0 };
  it("allows a clean supervised trade", () => {
    expect(checkPreTrade(DEFAULT_LIMITS, state, 1).allowed).toBe(true);
  });
  it("blocks an unattended session", () => {
    expect(checkPreTrade(DEFAULT_LIMITS, state, 1, false).allowed).toBe(false);
  });
  it("blocks past the daily loss limit", () => {
    expect(checkPreTrade(DEFAULT_LIMITS, { ...state, realizedPnl: -500 }, 1).allowed).toBe(false);
  });
  it("blocks oversized orders", () => {
    expect(checkPreTrade(DEFAULT_LIMITS, state, 99).allowed).toBe(false);
  });
});

describe("front-month contract resolution", () => {
  it("picks the nearest non-expired listing", () => {
    const now = new Date();
    const yy = now.getFullYear() % 100;
    const code = "FGHJKMNQUVXZ"[now.getMonth()]!;
    const later = "FGHJKMNQUVXZ"[(now.getMonth() + 3) % 12]!;
    const laterYear = now.getMonth() + 3 > 11 ? yy + 1 : yy;
    const picked = contractTest.pickFrontMonth("MES", [
      { id: `CON.F.US.MES.${later}${laterYear}` },
      { id: `CON.F.US.MES.${code}${yy}` },
      { id: `CON.F.US.MNQ.${code}${yy}` },
    ]);
    expect(picked).toBe(`CON.F.US.MES.${code}${yy}`);
  });

  it("returns null when nothing matches the root", () => {
    expect(contractTest.pickFrontMonth("MES", [{ id: "CON.F.US.MNQ.Z25" }])).toBeNull();
  });
});
