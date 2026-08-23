import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  ArrowRight,
  Blocks,
  Clapperboard,
  LayoutDashboard,
  Megaphone,
  PenTool,
  Sparkles,
  Users,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AethronMark } from "@/components/brand/aethron-logo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AETHRON — Creative Intelligence for modern advertising" },
      {
        name: "description",
        content:
          "Plan campaigns, shape ad concepts, build TikTok-first content, and manage every brand from one creative intelligence workspace.",
      },
      { property: "og:title", content: "AETHRON — Create. Launch. Scale." },
      {
        property: "og:description",
        content:
          "The creative intelligence operating system for brands, creators, sellers, and agencies.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

const CAPABILITIES = [
  {
    icon: Video,
    title: "TikTok Ad Lab",
    body: "Develop TikTok-first hooks, angles, and ad concepts built around the way people actually watch.",
  },
  {
    icon: PenTool,
    title: "Script Studio",
    body: "Turn campaign thinking into structured scripts, scenes, dialogue, and production-ready direction.",
  },
  {
    icon: Clapperboard,
    title: "Storyboard Builder",
    body: "Map commercials shot by shot and bring the creative vision into focus before production begins.",
  },
  {
    icon: Sparkles,
    title: "Creative Studio",
    body: "Organize concepts, references, and creative development in one focused production workspace.",
  },
  {
    icon: Megaphone,
    title: "Campaigns",
    body: "Connect objectives, audiences, offers, and deliverables so every asset serves the campaign brief.",
  },
  {
    icon: Blocks,
    title: "Brand Brain",
    body: "Keep positioning, voice, audience insight, and creative rules close to every decision.",
  },
  {
    icon: LayoutDashboard,
    title: "Content Planning",
    body: "Build a clear content system across ideas, formats, schedules, and campaign moments.",
  },
  {
    icon: Users,
    title: "Agency Workspace",
    body: "Move across brands and client work without losing the context behind the creative.",
  },
];

const WORKFLOW = [
  ["01", "Think", "Start with the brand, audience, offer, and campaign objective."],
  ["02", "Create", "Develop concepts, scripts, storyboards, and TikTok-first content."],
  ["03", "Scale", "Build a repeatable creative system across brands and campaigns."],
];

function LandingPage() {
  const navigate = useNavigate();
  useEffect(() => {
    const search = window.location.search;
    const hash = window.location.hash;
    if (/(access_token|error|error_code|token_hash|type=)/.test(search + hash)) {
      window.location.replace(`/auth-callback${search}${hash}`);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen overflow-hidden bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5" aria-label="AETHRON home">
            <AethronMark className="size-8" />
            <span className="font-display text-base font-bold uppercase tracking-[0.28em] text-gradient-brand">
              Aethron
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth" search={{}}>
                Sign In
              </Link>
            </Button>
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link to="/auth" search={{}}>
                Enter Studio
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative isolate">
          <div
            className="grid-backdrop pointer-events-none absolute inset-0 opacity-40"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -top-64 left-1/2 -z-10 size-[46rem] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
            style={{ backgroundImage: "var(--gradient-aurora)" }}
            aria-hidden
          />
          <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-20 text-center sm:px-6 sm:pb-28 sm:pt-28">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5">
              <span className="size-1.5 rounded-full bg-primary" />
              <span className="eyebrow">Creative Intelligence / Ad Studio</span>
            </span>
            <h1 className="mx-auto mt-7 max-w-5xl font-display text-5xl font-semibold leading-[0.98] tracking-[-0.04em] sm:text-7xl lg:text-8xl">
              Create. Launch. <span className="text-gradient-brand">Scale.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              AETHRON gives brands, sellers, creators, and agencies one creative intelligence
              workspace to plan campaigns, build TikTok-first ads, develop commercial concepts, and
              manage brand thinking from brief to production.
            </p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link to="/auth" search={{}}>
                  Enter Studio <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                <Link to="/auth" search={{}}>
                  Sign In
                </Link>
              </Button>
            </div>
            <div className="mx-auto mt-16 max-w-5xl rounded-2xl border border-border bg-card/70 p-2 shadow-2xl shadow-primary/5 backdrop-blur sm:mt-20">
              <div className="relative overflow-hidden rounded-xl border border-border bg-background/80 px-5 py-8 text-left sm:px-8 sm:py-10">
                <div
                  className="absolute right-0 top-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl"
                  aria-hidden
                />
                <div className="relative grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
                  <div>
                    <p className="eyebrow text-primary">AI Director architecture</p>
                    <h2 className="mt-3 font-display text-2xl font-semibold leading-tight sm:text-3xl">
                      One creative system. Every brand decision in context.
                    </h2>
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground sm:text-base">
                    A connected operating model for briefs, brand intelligence, campaign planning,
                    scripts, storyboards, and production workflows—designed to help creative teams
                    work with more clarity and consistency.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border/70 bg-card/30">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
            <div className="max-w-2xl">
              <p className="eyebrow text-primary">Inside the studio</p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-5xl">
                Built for the full creative operation.
              </h2>
              <p className="mt-4 leading-7 text-muted-foreground">
                Move from brand strategy to campaign-ready creative without scattering the thinking
                across disconnected tools.
              </p>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {CAPABILITIES.map(({ icon: Icon, title, body }) => (
                <article
                  key={title}
                  className="panel group min-h-56 p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--glow-brand)]"
                >
                  <span className="grid size-10 place-items-center rounded-md border border-primary/25 bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <h3 className="mt-6 font-display text-lg font-medium">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr]">
            <div>
              <p className="eyebrow text-primary">A creative operating system</p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-5xl">
                From first thought to the next winning direction.
              </h2>
            </div>
            <div className="divide-y divide-border border-y border-border">
              {WORKFLOW.map(([number, title, body]) => (
                <div
                  key={number}
                  className="grid gap-3 py-6 sm:grid-cols-[3rem_7rem_1fr] sm:items-start"
                >
                  <span className="font-mono text-xs text-primary">{number}</span>
                  <h3 className="font-display text-lg font-medium">{title}</h3>
                  <p className="text-sm leading-6 text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-20 sm:px-6 sm:pb-28">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl border border-primary/25 bg-card px-6 py-14 text-center sm:px-12 sm:py-20">
            <div
              className="pointer-events-none absolute inset-0 opacity-20"
              style={{ backgroundImage: "var(--gradient-aurora)" }}
              aria-hidden
            />
            <div className="relative">
              <p className="eyebrow text-primary">AETHRON Ad Studio</p>
              <h2 className="mx-auto mt-3 max-w-3xl font-display text-3xl font-semibold tracking-tight sm:text-5xl">
                Make every campaign smarter before it goes live.
              </h2>
              <p className="mx-auto mt-4 max-w-xl leading-7 text-muted-foreground">
                Bring the brand, brief, concept, script, and production plan into one focused
                workspace.
              </p>
              <Button asChild size="lg" className="mt-8 w-full sm:w-auto">
                <Link to="/auth" search={{}}>
                  Enter Studio <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-center text-xs text-muted-foreground sm:flex-row sm:px-6 sm:text-left">
          <span>© {new Date().getFullYear()} AETHRON. Creative Intelligence.</span>
          <span>Built for brands, creators, sellers, and agencies.</span>
        </div>
      </footer>
    </div>
  );
}
