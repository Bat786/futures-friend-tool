import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listTrades } from "@/lib/journal.functions";
import { equityCurve, pnlByHourOfDay, pnlBySetup, summary } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — expectancy, win rate and equity curve" },
      {
        name: "description",
        content:
          "See your futures edge: net P&L, expectancy, win rate, max drawdown, equity curve and performance by setup and hour.",
      },
      { property: "og:title", content: "Analytics — expectancy, win rate and equity curve" },
      {
        property: "og:description",
        content: "Turn your trade journal into a picture of where your edge actually comes from.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const trades = useQuery({ queryKey: ["trades"], queryFn: () => listTrades() });
  const rows = useMemo(() => (trades.data?.trades ?? []).filter((t) => !t.is_backtest), [trades.data]);

  const stats = useMemo(() => summary(rows), [rows]);
  const curve = useMemo(() => equityCurve(rows), [rows]);
  const bySetup = useMemo(() => pnlBySetup(rows), [rows]);
  const byHour = useMemo(() => pnlByHourOfDay(rows), [rows]);

  const fmtMoney = (v: number | null) => (v === null ? "—" : `$${v.toFixed(2)}`);
  const fmtPct = (v: number | null) => (v === null ? "—" : `${(v * 100).toFixed(1)}%`);

  if (trades.isLoading) {
    return (
      <AppShell>
        <Skeleton className="h-96 w-full" />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-5">
        <p className="eyebrow">Your edge</p>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Live trades only — backtest results are excluded.
        </p>
      </div>

      {rows.length === 0 ? (
        <Card className="panel">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Log a few trades in the journal and your edge metrics will appear here.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Net P&L" value={fmtMoney(stats.netPnl)} tone={stats.netPnl >= 0 ? "profit" : "loss"} />
            <Metric label="Expectancy / trade" value={fmtMoney(stats.expectancy)} />
            <Metric label="Win rate" value={fmtPct(stats.winRate)} />
            <Metric label="Max drawdown" value={fmtMoney(stats.maxDrawdown)} tone="loss" />
            <Metric label="Avg win" value={fmtMoney(stats.avgWin)} tone="profit" />
            <Metric label="Avg loss" value={fmtMoney(stats.avgLoss)} tone="loss" />
            <Metric label="Avg R multiple" value={stats.avgR === null ? "—" : stats.avgR.toFixed(2)} />
            <Metric label="Trades" value={String(stats.tradeCount)} />
          </div>

          <Card className="panel">
            <CardHeader>
              <CardTitle className="font-display text-base">Equity curve</CardTitle>
              <CardDescription>Cumulative realized P&L, trade by trade.</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={curve}>
                  <defs>
                    <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--profit)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--profit)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--grid)" strokeOpacity={0.6} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulativePnl"
                    stroke="var(--profit)"
                    strokeWidth={2}
                    fill="url(#equityFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="panel">
              <CardHeader>
                <CardTitle className="font-display text-base">P&L by setup</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bySetup}>
                    <CartesianGrid stroke="var(--grid)" strokeOpacity={0.6} />
                    <XAxis dataKey="setup" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                    <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                    <Tooltip
                      cursor={{ fill: "var(--grid)", fillOpacity: 0.35 }}
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="netPnl" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="panel">
              <CardHeader>
                <CardTitle className="font-display text-base">P&L by hour of day</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byHour}>
                    <CartesianGrid stroke="var(--grid)" strokeOpacity={0.6} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                    <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                    <Tooltip
                      cursor={{ fill: "var(--grid)", fillOpacity: 0.35 }}
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="netPnl" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "profit" | "loss" }) {
  return (
    <Card className="panel">
      <CardContent className="pt-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </div>
        <div
          className={cn(
            "tabular mt-1.5 text-2xl font-semibold",
            tone === "profit" && "text-profit",
            tone === "loss" && "text-loss",
          )}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}