import type { JournalTrade } from "./analytics";

type Raw = Record<string, unknown>;
const n = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
const s = (v: unknown): string | null => (typeof v === "string" ? v : null);

export function toJournalTrade(raw: unknown): JournalTrade {
  const r = (raw ?? {}) as Raw;
  return {
    id: s(r["id"]) ?? "",
    symbol: s(r["symbol"]) ?? "",
    side: s(r["side"]) ?? "buy",
    size: n(r["size"]) ?? 1,
    entry_price: n(r["entry_price"]),
    exit_price: n(r["exit_price"]),
    entry_time: s(r["entry_time"]) ?? new Date().toISOString(),
    exit_time: s(r["exit_time"]),
    fees: n(r["fees"]) ?? 0,
    pnl: n(r["pnl"]),
    pnl_r_multiple: n(r["pnl_r_multiple"]),
    stop_price: n(r["stop_price"]),
    target_price: n(r["target_price"]),
    setup_tag: s(r["setup_tag"]),
    status: s(r["status"]) ?? "open",
    notes: s(r["notes"]),
    is_backtest: r["is_backtest"] === true,
  };
}