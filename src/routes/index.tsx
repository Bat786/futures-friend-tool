import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Activity, BarChart3, BookOpen, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AethraMark } from "@/components/brand/aethra-logo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AETHRA — futures market intelligence and execution terminal" },
      {
        name: "description",
        content:
          "AETHRA is a modular futures terminal for prop-firm traders: market intelligence, a prop-firm risk engine, a trade journal and supervised, risk-gated execution.",
      },
      { property: "og:title", content: "AETHRA — futures market intelligence and execution terminal" },
      {
        property: "og:description",
        content: "A modular command center: intelligence, risk engine, journal and supervised execution.",
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
    title: "Modular command center",
    body: "Chart, signal, positions, risk, scanner, news and AI panels you can drag, resize and save as a layout per strategy.",
  },
  {
    icon: ShieldCheck,
    title: "Prop-firm risk engine",
    body: "Daily loss limit, trade count, loss streak and size caps are checked before any order leaves your device.",
  },
  {
    icon: Sparkles,
    title: "Market intelligence",
    body: "A transparent composite score from RSI, VWAP, MACD and momentum — every input shown so you can disagree with it.",
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

const STATS = [
  { label: "Composite range", value: "-100 / +100" },
  { label: "Voting inputs", value: "4" },
  { label: "Server risk checks", value: "5" },
  { label: "Unattended trades", value: "0" },
];

function LandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Auth links (confirmation, recovery) can land on the root URL; hand those
    // off to the dedicated callback page instead of silently ignoring them.
    const search = window.location.search;
    const hash = window.location.hash;
    if (/(access_token|error|error_code|token_hash|type=)/.test(search + hash)) {
      window.location.replace(`/auth-callback${search}${hash}`);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/workspace", replace: true });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <AethraMark className="size-8" />
            <span className="font-display text-base font-bold uppercase tracking-[0.32em] text-gradient-brand">
              Aethra
            </span>
          </div>
          <Button asChild size="sm">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-40" aria-hidden />
          <div
            className="pointer-events-none absolute -top-56 left-1/2 size-[44rem] -translate-x-1/2 rounded-full opacity-20 blur-3xl"
            style={{ backgroundImage: "var(--gradient-aurora)" }}
            aria-hidden
          />
          <div className="relative mx-auto max-w-6xl px-4 py-24 text-center sm:py-32">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1">
              <span className="size-1.5 rounded-full bg-primary" />
              <span className="eyebrow">Topstep / TopstepX</span>
            </span>

            <h1 className="mx-auto mt-7 max-w-4xl text-4xl font-semibold leading-[1.08] sm:text-6xl">
              Market intelligence that reads the tape and{" "}
              <span className="text-gradient-brand">keeps you inside your rules</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
              Live charting, a transparent composite signal, a journal that computes your real edge, and
              order entry that refuses to break your own risk limits. Supervised by design — nothing
              trades while you're away.
            </p>

            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/auth">
                  <TrendingUp className="size-4" />
                  Open the workspace
                </Link>
              </Button>
            </div>

            <dl className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
              {STATS.map(({ label, value }) => (
                <div key={label} className="bg-card px-4 py-5">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    {label}
                  </dt>
                  <dd className="tabular mt-2 text-lg font-semibold text-primary">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-28">
          <h2 className="text-center font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            One workspace, every decision
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <article
                key={title}
                className="panel group p-6 transition-shadow duration-300 hover:shadow-[var(--glow-brand)]"
              >
                <span className="grid size-10 place-items-center rounded-md border border-primary/25 bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-105">
                  <Icon className="size-4" />
                </span>
                <h3 className="mt-5 font-display text-lg font-medium">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-10 text-center text-xs text-muted-foreground">
        Not financial advice. Trading futures carries substantial risk of loss.
      </footer>
    </div>
  );
}