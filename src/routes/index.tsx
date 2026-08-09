import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Activity, BarChart3, BookOpen, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Signal Desk — futures signal, journal and execution terminal" },
      {
        name: "description",
        content:
          "A supervised futures terminal for Topstep traders: live charts, a weighted signal gauge, a full trade journal and risk-gated order execution.",
      },
      { property: "og:title", content: "Signal Desk — futures signal and execution terminal" },
      {
        property: "og:description",
        content: "Charts, signals, journal and risk-gated execution for Topstep futures traders.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

const FEATURES = [
  {
    icon: Activity,
    title: "Signal gauge",
    body: "RSI, VWAP, MACD and momentum vote on one -100 to +100 score, with every input shown so you can disagree with it.",
  },
  {
    icon: ShieldCheck,
    title: "Risk-gated execution",
    body: "Daily loss limit, trade count, loss streak and size caps are checked on the server before any order leaves.",
  },
  {
    icon: BookOpen,
    title: "Trade journal",
    body: "Log entries, exits, stops, setups and notes. P&L and R multiple are computed from contract tick values.",
  },
  {
    icon: BarChart3,
    title: "Edge analytics",
    body: "Expectancy, win rate, drawdown, equity curve and performance broken down by setup and hour of day.",
  },
];

function LandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/terminal", replace: true });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded bg-primary/15 text-primary">
              <Activity className="size-4" />
            </span>
            <span className="font-mono text-sm font-semibold tracking-tight">SIGNAL DESK</span>
          </div>
          <Button asChild size="sm">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 py-20 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Topstep / TopstepX</p>
          <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            A futures terminal that reads the tape and keeps you inside your rules
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-muted-foreground">
            Live charting, a transparent composite signal, a journal that computes your real edge, and order entry that
            refuses to break your own risk limits. Supervised by design — nothing trades while you're away.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Open the terminal</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24">
          <div className="grid gap-4 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-lg border border-border bg-card p-6">
                <span className="grid size-9 place-items-center rounded bg-primary/15 text-primary">
                  <Icon className="size-4" />
                </span>
                <h2 className="mt-4 text-lg font-medium">{title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        Not financial advice. Trading futures carries substantial risk of loss.
      </footer>
    </div>
  );
}