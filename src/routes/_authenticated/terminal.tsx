import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useMemo, useState } from "react";
import { AlertTriangle, Lock, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { SignalGauge } from "@/components/signal-gauge";
import { WatchlistStrip } from "@/components/watchlist-strip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ClientOnly } from "@tanstack/react-router";
import { getRiskState } from "@/lib/journal.functions";
import { TIMEFRAMES, instrumentBySymbol, type Timeframe } from "@/lib/market";
import { vwap } from "@/lib/indicators";
import { computeSignal, DEFAULT_WEIGHTS } from "@/lib/signal";
import { useBrokerVault } from "@/lib/broker-vault";
import { fetchBars } from "@/lib/broker-client";
import { cn } from "@/lib/utils";

const PriceChart = lazy(() => import("@/components/price-chart"));

export const Route = createFileRoute("/_authenticated/terminal")({
  head: () => ({
    meta: [
      { title: "Terminal — live futures signal gauge" },
      {
        name: "description",
        content:
          "Candlestick chart, session VWAP and a weighted RSI/VWAP/MACD/momentum signal gauge for ES, NQ, CL, GC and YM futures.",
      },
      { property: "og:title", content: "Terminal — live futures signal gauge" },
      {
        property: "og:description",
        content: "Read the composite futures signal and its underlying indicators in one view.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TerminalPage,
});

function TerminalPage() {
  const [symbol, setSymbol] = useState("MES");
  const [timeframe, setTimeframe] = useState<Timeframe>("5m");
  const inst = instrumentBySymbol(symbol);

  const query = useQuery({
    queryKey: ["bars", symbol, timeframe],
    queryFn: () => getBars({ data: { symbol, timeframe, count: 300 } }),
    refetchInterval: 30_000,
  });

  const risk = useQuery({ queryKey: ["risk-state"], queryFn: () => getRiskState() });
  const weights = risk.data?.weights ?? DEFAULT_WEIGHTS;

  const bars = query.data?.bars ?? [];
  const vwapSeries = useMemo(() => vwap(bars), [bars]);
  const signal = useMemo(() => computeSignal(bars, timeframe, weights), [bars, timeframe, weights]);

  const lastBar = bars[bars.length - 1];
  const prevBar = bars[bars.length - 2];
  const change = lastBar && prevBar ? lastBar.close - prevBar.close : 0;
  const precision = inst.tickSize < 1 ? String(inst.tickSize).split(".")[1]!.length : 0;

  return (
    <AppShell>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Instrument</p>
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight">{inst.name}</h2>
          <p className="tabular mt-1 text-xs text-muted-foreground">
            tick {inst.tickSize} = ${inst.tickValue}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-sm border border-border bg-card p-0.5">
            {TIMEFRAMES.map((t) => (
              <button
                key={t.value}
                onClick={() => setTimeframe(t.value)}
                className={cn(
                  "rounded-sm px-3 py-1.5 font-mono text-xs transition-colors",
                  t.value === timeframe
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {t.value}
              </button>
            ))}
          </div>
          <Button variant="outline" size="icon" onClick={() => query.refetch()} aria-label="Refresh data">
            <RefreshCw className={cn("size-4", query.isFetching && "animate-spin")} />
          </Button>
        </div>
      </div>

      {query.data?.source === "simulated" && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            Showing simulated bars{query.data.error ? ` — ${query.data.error}` : ""}. Add your TopstepX credentials in
            settings to stream live market data.
          </span>
        </div>
      )}

      <WatchlistStrip symbol={symbol} timeframe={timeframe} onSelect={setSymbol} />

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="panel">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="tabular text-base">
              {symbol}
              {lastBar && (
                <span className="ml-3 text-sm font-normal">
                  {lastBar.close.toFixed(precision)}{" "}
                  <span className={change >= 0 ? "text-profit" : "text-loss"}>
                    {change >= 0 ? "+" : ""}
                    {change.toFixed(precision)}
                  </span>
                </span>
              )}
            </CardTitle>
            <Badge
              variant="outline"
              className={cn(
                "font-mono text-[10px] tracking-[0.16em]",
                query.data?.source === "live"
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-warning/40 bg-warning/10 text-warning",
              )}
            >
              {query.data?.source === "live" ? "LIVE" : "SIM"}
            </Badge>
          </CardHeader>
          <CardContent>
            {query.isLoading ? (
              <Skeleton className="h-[420px] w-full" />
            ) : (
              <ClientOnly fallback={<Skeleton className="h-[420px] w-full" />}>
                <Suspense fallback={<Skeleton className="h-[420px] w-full" />}>
                  <PriceChart bars={bars} vwapSeries={vwapSeries} precision={precision} />
                </Suspense>
              </ClientOnly>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="panel-glow">
            <CardHeader>
              <CardTitle className="font-display text-base">Composite signal</CardTitle>
            </CardHeader>
            <CardContent>
              {query.isLoading ? <Skeleton className="h-40 w-full" /> : <SignalGauge signal={signal} />}
            </CardContent>
          </Card>

          <Card className="panel">
            <CardHeader>
              <CardTitle className="font-display text-base">Indicators</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border/70">
              {signal.readings.map((r) => (
                <div key={r.name} className="flex items-start justify-between gap-3 py-3 text-sm first:pt-0 last:pb-0">
                  <div>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.note}</div>
                  </div>
                  <div className="text-right">
                    <div className="tabular">{r.display}</div>
                    <div
                      className={cn(
                        "font-mono text-[10px] uppercase tracking-[0.14em]",
                        r.direction === "bullish" && "text-profit",
                        r.direction === "bearish" && "text-loss",
                        r.direction === "neutral" && "text-muted-foreground",
                      )}
                    >
                      {r.weight > 0 ? r.direction : "context"}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}