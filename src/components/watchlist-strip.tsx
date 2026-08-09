import { useQueries } from "@tanstack/react-query";
import { useBrokerVault } from "@/lib/broker-vault";
import { fetchBars } from "@/lib/broker-client";
import { instrumentBySymbol, WATCHLIST, type Timeframe } from "@/lib/market";
import { cn } from "@/lib/utils";

/** Top instrument strip — a row of hardware "channel" buttons with live last/change. */
export function WatchlistStrip({
  symbol,
  timeframe,
  onSelect,
}: {
  symbol: string;
  timeframe: Timeframe;
  onSelect: (s: string) => void;
}) {
  const { config } = useBrokerVault();

  const results = useQueries({
    queries: WATCHLIST.map((s) => ({
      queryKey: ["bars", s, timeframe, config?.baseUrl ?? "sim"],
      queryFn: () => fetchBars(s, timeframe, 300, config),
      refetchInterval: 30_000,
      staleTime: 15_000,
    })),
  });

  return (
    <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {WATCHLIST.map((s, i) => {
        const inst = instrumentBySymbol(s);
        const bars = results[i]?.data?.bars ?? [];
        const last = bars[bars.length - 1];
        const prev = bars[bars.length - 2];
        const change = last && prev ? last.close - prev.close : 0;
        const pct = last && prev && prev.close ? (change / prev.close) * 100 : 0;
        const precision = inst.tickSize < 1 ? String(inst.tickSize).split(".")[1]!.length : 0;
        const active = s === symbol;

        return (
          <button
            key={s}
            onClick={() => onSelect(s)}
            className={cn(
              "panel relative px-3 py-2.5 text-left transition-colors",
              active ? "border-primary/60" : "hover:border-primary/30",
            )}
          >
            <span className="absolute right-2 top-2 screw" aria-hidden />
            <div className="flex items-center gap-2">
              <span
                className={cn("size-1.5 rounded-full", active ? "bg-primary" : "bg-etch")}
                style={active ? { boxShadow: "0 0 8px 0 var(--primary)" } : undefined}
                aria-hidden
              />
              <span className="font-mono text-xs font-semibold tracking-[0.12em]">{s}</span>
            </div>
            <div className="tabular mt-1.5 text-sm">{last ? last.close.toFixed(precision) : "—"}</div>
            <div className={cn("tabular text-[11px]", change >= 0 ? "text-profit" : "text-loss")}>
              {change >= 0 ? "+" : ""}
              {change.toFixed(precision)} ({pct >= 0 ? "+" : ""}
              {pct.toFixed(2)}%)
            </div>
          </button>
        );
      })}
    </div>
  );
}
