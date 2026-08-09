import { ClientOnly } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Activity, Newspaper, Radar, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { SignalGauge } from "@/components/signal-gauge";
import { useBrokerVault } from "@/lib/broker-vault";
import { fetchBars, searchAccounts, searchPositions } from "@/lib/broker-client";
import { getNewsFeed } from "@/lib/news.functions";
import { getRiskState, listTrades } from "@/lib/journal.functions";
import { instrumentBySymbol, WATCHLIST, type Timeframe } from "@/lib/market";
import { vwap } from "@/lib/indicators";
import { computeSignal, DEFAULT_WEIGHTS } from "@/lib/signal";
import { cn } from "@/lib/utils";
import type { PanelId } from "@/lib/workspace-layouts";

const PriceChart = lazy(() => import("@/components/price-chart"));

export type PanelContext = { symbol: string; timeframe: Timeframe };

const money = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

function Empty({ icon: Icon, title, body }: { icon: typeof Radar; title: string; body: string }) {
  return (
    <div className="flex h-full min-h-32 flex-col items-center justify-center gap-2 px-4 text-center">
      <Icon className="size-5 text-muted-foreground" />
      <p className="font-display text-xs font-semibold">{title}</p>
      <p className="max-w-[38ch] text-xs leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function useBars(ctx: PanelContext) {
  const { config } = useBrokerVault();
  return useQuery({
    queryKey: ["bars", ctx.symbol, ctx.timeframe, config?.baseUrl ?? "sim"],
    queryFn: () => fetchBars(ctx.symbol, ctx.timeframe, 300, config),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

function ChartPanel({ ctx }: { ctx: PanelContext }) {
  const inst = instrumentBySymbol(ctx.symbol);
  const q = useBars(ctx);
  const bars = q.data?.bars ?? [];
  const series = useMemo(() => vwap(bars), [bars]);
  const precision = inst.tickSize < 1 ? String(inst.tickSize).split(".")[1]!.length : 0;

  if (q.isLoading) return <Skeleton className="h-full min-h-56 w-full" />;
  return (
    <div className="h-full min-h-56">
      <ClientOnly fallback={<Skeleton className="h-full w-full" />}>
        <Suspense fallback={<Skeleton className="h-full w-full" />}>
          <PriceChart bars={bars} vwapSeries={series} precision={precision} />
        </Suspense>
      </ClientOnly>
    </div>
  );
}

function SignalPanel({ ctx }: { ctx: PanelContext }) {
  const q = useBars(ctx);
  const risk = useQuery({ queryKey: ["risk-state"], queryFn: () => getRiskState() });
  const weights = risk.data?.weights ?? DEFAULT_WEIGHTS;
  const signal = useMemo(
    () => computeSignal(q.data?.bars ?? [], ctx.timeframe, weights),
    [q.data?.bars, ctx.timeframe, weights],
  );

  if (q.isLoading) return <Skeleton className="h-40 w-full" />;
  return (
    <div className="space-y-3">
      <SignalGauge signal={signal} />
      <ul className="divide-y divide-border/70 text-xs">
        {signal.readings.map((r) => (
          <li key={r.name} className="flex items-center justify-between gap-3 py-2">
            <span className="min-w-0 truncate">{r.name}</span>
            <span className="flex shrink-0 items-center gap-2">
              <span className="tabular">{r.display}</span>
              <span
                className={cn(
                  "font-mono text-[10px] uppercase tracking-[0.14em]",
                  r.direction === "bullish" && "text-profit",
                  r.direction === "bearish" && "text-loss",
                  r.direction === "neutral" && "text-muted-foreground",
                )}
              >
                {r.direction}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PositionsPanel() {
  const { config } = useBrokerVault();
  const q = useQuery({
    queryKey: ["positions", config?.baseUrl ?? "none"],
    queryFn: async () => {
      const { accounts } = await searchAccounts(config!);
      const account = accounts[0];
      if (!account) return { positions: [] };
      return searchPositions(config!, Number(account.id));
    },
    enabled: Boolean(config),
    refetchInterval: 15_000,
  });

  if (!config) {
    return (
      <Empty
        icon={Activity}
        title="Broker not unlocked"
        body="Unlock your local TopstepX vault in Risk settings to stream positions from this device."
      />
    );
  }
  if (q.isLoading) return <Skeleton className="h-24 w-full" />;
  const positions = q.data?.positions ?? [];
  if (!positions.length) {
    return <Empty icon={Activity} title="Flat" body="No open positions on the connected account." />;
  }
  return (
    <ul className="space-y-2">
      {positions.map((p, i) => (
        <li key={i} className="flex items-center justify-between gap-3 rounded-md border border-border/70 px-3 py-2 text-xs">
          <span className="min-w-0 truncate font-mono">{p.contractId}</span>
          <span className="tabular shrink-0">
            {p.size} @ {p.averagePrice}
          </span>
        </li>
      ))}
    </ul>
  );
}

function RiskPanel() {
  const q = useQuery({ queryKey: ["risk-state"], queryFn: () => getRiskState() });
  if (q.isLoading) return <Skeleton className="h-32 w-full" />;
  const limits = q.data?.limits;
  const state = q.data?.state;
  if (!limits || !state) return <Empty icon={Activity} title="No risk data" body="Risk settings are unavailable." />;

  const lossUsed = Math.min(100, (Math.abs(Math.min(0, state.realizedPnl)) / Math.abs(limits.dailyLossLimit)) * 100);
  const tradesUsed = Math.min(100, (state.tradesCount / limits.maxTradesPerDay) * 100);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-baseline justify-between">
          <span className="etch-label">Realized today</span>
          <span className={cn("tabular text-lg font-semibold", state.realizedPnl >= 0 ? "text-profit" : "text-loss")}>
            {money(state.realizedPnl)}
          </span>
        </div>
        <Progress value={lossUsed} className="mt-2 h-1.5" />
        <p className="mt-1 text-[11px] text-muted-foreground">
          {lossUsed.toFixed(0)}% of the {money(-Math.abs(limits.dailyLossLimit))} daily loss limit
        </p>
      </div>
      <div>
        <div className="flex items-baseline justify-between">
          <span className="etch-label">Trades</span>
          <span className="tabular text-sm">
            {state.tradesCount}/{limits.maxTradesPerDay}
          </span>
        </div>
        <Progress value={tradesUsed} className="mt-2 h-1.5" />
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-md border border-border/70 px-3 py-2">
          <div className="etch-label">Loss streak</div>
          <div className="tabular mt-0.5">
            {state.consecutiveLosses}/{limits.maxConsecutiveLosses}
          </div>
        </div>
        <div className="rounded-md border border-border/70 px-3 py-2">
          <div className="etch-label">Max size</div>
          <div className="tabular mt-0.5">{limits.maxPositionSize}</div>
        </div>
      </div>
      {limits.killSwitchArmed && (
        <Badge variant="outline" className="border-destructive/50 bg-destructive/10 font-mono text-[10px] text-destructive">
          KILL SWITCH ARMED
        </Badge>
      )}
    </div>
  );
}

function ScannerPanel({ ctx }: { ctx: PanelContext }) {
  const { config } = useBrokerVault();
  const risk = useQuery({ queryKey: ["risk-state"], queryFn: () => getRiskState() });
  const weights = risk.data?.weights ?? DEFAULT_WEIGHTS;
  const results = WATCHLIST.map((s) => s);

  const scans = useQuery({
    queryKey: ["scanner", ctx.timeframe, config?.baseUrl ?? "sim"],
    queryFn: async () => {
      const rows = await Promise.all(
        results.map(async (s) => {
          const { bars } = await fetchBars(s, ctx.timeframe, 300, config);
          return { symbol: s, signal: computeSignal(bars, ctx.timeframe, weights) };
        }),
      );
      return rows.sort((a, b) => Math.abs(b.signal.score) - Math.abs(a.signal.score));
    },
    refetchInterval: 60_000,
  });

  if (scans.isLoading) return <Skeleton className="h-32 w-full" />;
  return (
    <ul className="divide-y divide-border/70 text-xs">
      {(scans.data ?? []).map((row) => (
        <li key={row.symbol} className="flex items-center justify-between gap-3 py-2">
          <span className="font-mono">{row.symbol}</span>
          <span className="flex items-center gap-2">
            <span
              className={cn(
                "tabular",
                row.signal.score > 0 ? "text-profit" : row.signal.score < 0 ? "text-loss" : "text-muted-foreground",
              )}
            >
              {row.signal.score > 0 ? "+" : ""}
              {row.signal.score.toFixed(0)}
            </span>
            <span className="etch-label">{row.signal.direction}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

const IMPACT_CLASS: Record<string, string> = {
  high: "border-destructive/50 bg-destructive/10 text-destructive",
  important: "border-warning/50 bg-warning/10 text-warning",
  moderate: "border-primary/40 bg-primary/10 text-primary",
  low: "border-border bg-muted/40 text-muted-foreground",
};

function NewsPanel() {
  const q = useQuery({ queryKey: ["news"], queryFn: () => getNewsFeed({ data: { limit: 20 } }), staleTime: 120_000 });
  if (q.isLoading) return <Skeleton className="h-32 w-full" />;
  const feed = q.data;
  if (!feed?.configured) {
    return (
      <Empty
        icon={Newspaper}
        title="News feed not connected"
        body="Add a news provider key and this panel will stream impact-tiered headlines mapped to the futures they move."
      />
    );
  }
  if (feed.error) return <Empty icon={Newspaper} title="Feed error" body={feed.error} />;
  return (
    <ul className="space-y-2">
      {feed.news.map((n) => (
        <li key={n.id} className="rounded-md border border-border/70 px-3 py-2">
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 text-xs leading-snug">{n.headline}</p>
            <Badge variant="outline" className={cn("shrink-0 font-mono text-[9px] uppercase", IMPACT_CLASS[n.impact])}>
              {n.impact}
            </Badge>
          </div>
          <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="truncate">{n.source}</span>
            {n.instruments.length > 0 && <span className="font-mono">{n.instruments.join(" · ")}</span>}
          </div>
        </li>
      ))}
    </ul>
  );
}

function AiPanel({ ctx }: { ctx: PanelContext }) {
  const q = useBars(ctx);
  const risk = useQuery({ queryKey: ["risk-state"], queryFn: () => getRiskState() });
  const weights = risk.data?.weights ?? DEFAULT_WEIGHTS;
  const signal = useMemo(
    () => computeSignal(q.data?.bars ?? [], ctx.timeframe, weights),
    [q.data?.bars, ctx.timeframe, weights],
  );

  const agree = signal.readings.filter((r) => r.direction === signal.direction).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-ai" />
        <span className="etch-label">Read on {ctx.symbol}</span>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        The composite score is{" "}
        <span className={cn("tabular", signal.score > 0 ? "text-profit" : signal.score < 0 ? "text-loss" : "")}>
          {signal.score.toFixed(0)}
        </span>{" "}
        ({signal.direction}) on the {ctx.timeframe} chart, with {agree} of {signal.readings.length} indicators aligned.
        Conviction rises above ±20; below that AETHRON treats the tape as chop and recommends standing aside.
      </p>
      <div className="rounded-md border border-ai/30 bg-ai/5 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
        Intelligence is advisory. Every order still requires you at the desk on your personal device.
      </div>
    </div>
  );
}

function JournalPanel() {
  const q = useQuery({ queryKey: ["trades"], queryFn: () => listTrades() });
  if (q.isLoading) return <Skeleton className="h-32 w-full" />;
  const trades = (q.data?.trades ?? []).slice(0, 8);
  if (!trades.length) {
    return (
      <Empty
        icon={Activity}
        title="No trades logged"
        body="Executed orders land here automatically, with the indicator snapshot taken at entry."
      />
    );
  }
  return (
    <ul className="divide-y divide-border/70 text-xs">
      {trades.map((t) => (
        <li key={t.id} className="flex items-center justify-between gap-3 py-2">
          <span className="min-w-0 truncate">
            <span className="font-mono">{t.symbol}</span>{" "}
            <span className="etch-label">{t.side}</span>
          </span>
          <span className={cn("tabular shrink-0", (t.pnl ?? 0) >= 0 ? "text-profit" : "text-loss")}>
            {t.pnl === null ? "open" : money(Number(t.pnl))}
          </span>
        </li>
      ))}
      <li className="pt-2">
        <Link to="/journal" className="text-[11px] text-primary underline-offset-4 hover:underline">
          Open full journal
        </Link>
      </li>
    </ul>
  );
}

export function PanelBody({ id, ctx }: { id: PanelId; ctx: PanelContext }) {
  switch (id) {
    case "chart":
      return <ChartPanel ctx={ctx} />;
    case "signal":
      return <SignalPanel ctx={ctx} />;
    case "positions":
      return <PositionsPanel />;
    case "risk":
      return <RiskPanel />;
    case "scanner":
      return <ScannerPanel ctx={ctx} />;
    case "news":
      return <NewsPanel />;
    case "ai":
      return <AiPanel ctx={ctx} />;
    case "journal":
      return <JournalPanel />;
    default:
      return null;
  }
}