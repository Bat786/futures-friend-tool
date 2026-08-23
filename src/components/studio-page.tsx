/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Copy,
  Download,
  ExternalLink,
  Image,
  Link2,
  LockKeyhole,
  Plus,
  Search,
  Sparkles,
  Upload,
} from "lucide-react";
import { StudioShell } from "@/components/studio-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useStudio } from "@/hooks/use-studio";
import {
  campaignObjectives,
  conceptAngles,
  integrations,
  platforms,
  type Brand,
  type Campaign,
} from "@/lib/studio-data";
const Box = ({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <Card className={`panel ${className}`}>
    <CardHeader>
      <CardTitle className="text-sm">{title}</CardTitle>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);
const Empty = ({ title, copy, action }: { title: string; copy: string; action?: string }) => (
  <div className="grid min-h-40 place-items-center rounded-xl border border-dashed p-6 text-center">
    <div>
      <div className="font-display font-semibold">{title}</div>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{copy}</p>
      {action && (
        <Button className="mt-4">
          <Plus className="size-4" />
          {action}
        </Button>
      )}
    </div>
  </div>
);
const Header = ({
  eyebrow,
  title,
  copy,
  action,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  action?: React.ReactNode;
}) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
    <div>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{copy}</p>
    </div>
    {action}
  </div>
);
export function StudioPage({ module }: { module: string }) {
  return (
    <StudioShell>
      <Module name={module} />
    </StudioShell>
  );
}
function Module({ name }: { name: string }) {
  const { state, setState } = useStudio();
  if (name === "dashboard")
    return (
      <>
        <Header
          eyebrow="Live workspace"
          title="Agency command center"
          copy="Every brand, campaign and creative workflow in one private operating surface."
          action={
            <Button>
              <Sparkles />
              Quick create
            </Button>
          }
        />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            [
              "Active campaigns",
              state.campaigns.filter((c) => !["Archived", "Published"].includes(c.status)).length,
            ],
            ["Brands", state.brands.length],
            ["Draft creatives", 0],
            ["Approved", state.campaigns.filter((c) => c.status === "Approved").length],
          ].map(([a, b]) => (
            <Box key={a} title={String(a)}>
              <div className="font-display text-3xl font-semibold">{b}</div>
              <div className="mt-2 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                Works now · local
              </div>
            </Box>
          ))}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Box title="Quick create">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                "Website → Campaign",
                "Image Ad",
                "Social Post",
                "TikTok Creative",
                "Reel / Story",
                "GIF / Motion",
                "5–10s Commercial",
                "Product Ad",
                "Sales Campaign",
              ].map((x) => (
                <Button key={x} variant="outline" className="h-16 justify-between text-left">
                  {x}
                  <ArrowRight className="size-4" />
                </Button>
              ))}
            </div>
          </Box>
          <Box title="Campaign pipeline">
            {state.campaigns.length ? (
              <div className="space-y-2">
                {state.campaigns.slice(0, 5).map((c) => (
                  <div
                    className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                    key={c.id}
                  >
                    <span>{c.name}</span>
                    <Badge>{c.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <Empty title="Clear runway" copy="Campaigns will appear here as you build them." />
            )}
          </Box>
        </div>
      </>
    );
  if (name === "brands") return <Brands state={state} setState={setState} />;
  if (name === "campaigns" || name === "create")
    return <Campaigns state={state} setState={setState} />;
  if (name === "creative-studio") return <CreativeStudio />;
  if (name === "website-lab") return <WebsiteLab />;
  if (name === "content") return <Content />;
  if (name === "agency") return <Agency state={state} setState={setState} />;
  if (name === "analytics")
    return (
      <>
        <Header
          eyebrow="Measurement foundation"
          title="Performance intelligence"
          copy="Schema-ready reporting without fabricated numbers."
        />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {["Spend", "Impressions", "CTR", "ROAS"].map((x) => (
            <Box title={x} key={x}>
              <div className="text-2xl text-muted-foreground">—</div>
              <Badge variant="outline">Awaiting provider</Badge>
            </Box>
          ))}
        </div>
        <Box title="Connect a data source" className="mt-4">
          <Empty
            title="No performance source connected"
            copy="TikTok, Meta, Google, YouTube, X, LinkedIn and Pinterest providers can implement the shared reporting interface."
          />
        </Box>
      </>
    );
  if (name === "library")
    return (
      <>
        <Header
          eyebrow="Asset memory"
          title="Creative library"
          copy="Searchable home for logos, product photos, backgrounds, creatives, motion, copy, scripts and exports."
          action={
            <Button>
              <Upload />
              Upload asset
            </Button>
          }
        />
        <div className="mb-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search tags, brands, campaigns…" />
          </div>
        </div>
        <Empty
          title="Your library is ready"
          copy="Browser uploads and editor exports can be catalogued by brand and campaign."
          action="Add first asset"
        />
      </>
    );
  if (name === "ai-director")
    return (
      <>
        <Header
          eyebrow="Provider-ready"
          title="AI Creative Director"
          copy="Brand strategy, campaign development, copy, prompts, critique and testing—only after a real provider is configured."
        />
        <Box title="Director console">
          <Textarea
            rows={8}
            placeholder="Ask the director to analyze a brand, develop a campaign, critique a creative, or design an A/B test…"
          />
          <div className="mt-3 flex items-center justify-between">
            <Badge variant="outline">
              <LockKeyhole className="mr-1 size-3" />
              AI provider required
            </Badge>
            <Button disabled={!integrations.ai}>Send brief</Button>
          </div>
        </Box>
      </>
    );
  return <SettingsPage />;
}

function Brands({ state, setState }: any) {
  const [selected, setSelected] = useState<Brand>(state.brands[0]);
  const update = (k: keyof Brand, v: any) => setSelected({ ...selected, [k]: v });
  const save = () =>
    setState({
      ...state,
      brands: state.brands.map((b: Brand) => (b.id === selected.id ? selected : b)),
    });
  return (
    <>
      <Header
        eyebrow="Reusable intelligence"
        title="Brand profiles"
        copy="Portable brand context designed to migrate cleanly from local storage to Supabase."
        action={
          <Button
            onClick={() => {
              const b = { ...state.brands[0], id: crypto.randomUUID(), name: "New Brand" };
              setState({ ...state, brands: [...state.brands, b] });
              setSelected(b);
            }}
          >
            <Plus />
            New brand
          </Button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <Box title="Brands">
          <div className="space-y-2">
            {state.brands.map((b: Brand) => (
              <button
                className={`w-full rounded-lg border p-3 text-left ${b.id === selected.id ? "border-primary bg-primary/10" : ""}`}
                onClick={() => setSelected(b)}
                key={b.id}
              >
                <b>{b.name}</b>
                <p className="text-xs text-muted-foreground">{b.industry}</p>
              </button>
            ))}
          </div>
        </Box>
        <Box title="Brand intelligence">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["name", "Brand name"],
              ["website", "Website"],
              ["industry", "Industry"],
              ["products", "Products / services"],
              ["audience", "Target customers"],
              ["valueProposition", "Value proposition"],
              ["voice", "Brand voice"],
              ["cta", "Default CTA"],
              ["socials", "Social handles"],
              ["competitors", "Competitors"],
              ["goals", "Marketing goals"],
              ["bannedPhrases", "Do-not-use phrases"],
              ["fonts", "Fonts"],
              ["notes", "Notes"],
            ].map(([k, l]) => (
              <label className="text-xs text-muted-foreground" key={k}>
                {l}
                <Input
                  value={(selected as any)[k as string]}
                  onChange={(e) => update(k as keyof Brand, e.target.value)}
                  className="mt-1 text-foreground"
                />
              </label>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {selected.pillars.map((p) => (
              <Badge key={p}>{p}</Badge>
            ))}
          </div>
          <Button className="mt-4" onClick={save}>
            <Check />
            Save profile
          </Button>
        </Box>
      </div>
    </>
  );
}

function Campaigns({ state, setState }: any) {
  const [f, setF] = useState({
    name: "",
    brandId: state.brands[0]?.id || "",
    product: "",
    offer: "",
    objective: campaignObjectives[0]!,
    audience: "",
    platform: platforms[0]!,
    funnel: "Awareness",
    tone: "",
    cta: "",
    budget: "",
    dates: "",
    notes: "",
  });
  const save = () => {
    if (!f.name) return;
    const c: Campaign = {
      ...f,
      id: crypto.randomUUID(),
      status: "Draft",
      updatedAt: new Date().toISOString(),
    };
    setState({ ...state, campaigns: [c, ...state.campaigns] });
    setF({ ...f, name: "" });
  };
  return (
    <>
      <Header
        eyebrow="Campaign intelligence"
        title="Campaign pipeline"
        copy="Structured strategy, creative direction and approval state without invented AI output."
      />
      <div className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
        <Box title="New campaign">
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(f).map(([k, v]) => (
              <label key={k} className="text-xs capitalize text-muted-foreground">
                {k.replace(/([A-Z])/g, " $1")}
                <Input
                  className="mt-1 text-foreground"
                  value={v}
                  onChange={(e) => setF({ ...f, [k]: e.target.value })}
                />
              </label>
            ))}
          </div>
          <Button onClick={save} className="mt-4">
            <Plus />
            Create workspace
          </Button>
        </Box>
        <Box title="Campaigns">
          {state.campaigns.length ? (
            <div className="space-y-2">
              {state.campaigns.map((c: Campaign) => (
                <div className="rounded-lg border p-3" key={c.id}>
                  <div className="flex justify-between">
                    <b>{c.name}</b>
                    <select
                      value={c.status}
                      onChange={(e) =>
                        setState({
                          ...state,
                          campaigns: state.campaigns.map((x: Campaign) =>
                            x.id === c.id ? { ...x, status: e.target.value } : x,
                          ),
                        })
                      }
                      className="rounded bg-muted px-2 text-xs"
                    >
                      <option>Draft</option>
                      <option>In Progress</option>
                      <option>Needs Review</option>
                      <option>Approved</option>
                      <option>Published</option>
                      <option>Archived</option>
                    </select>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {c.platform} · {c.objective} · {c.audience || "Audience pending"}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setState({
                          ...state,
                          campaigns: [
                            { ...c, id: crypto.randomUUID(), name: c.name + " Copy" },
                            ...state.campaigns,
                          ],
                        })
                      }
                    >
                      <Copy />
                      Duplicate
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setState({
                          ...state,
                          campaigns: state.campaigns.filter((x: Campaign) => x.id !== c.id),
                        })
                      }
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty title="No campaigns yet" copy="Create your first strategy workspace." />
          )}
        </Box>
      </div>
      <Box title="Variation lab" className="mt-4">
        <div className="flex flex-wrap gap-2">
          {conceptAngles.map((x) => (
            <Badge variant="outline" key={x}>
              {x}
            </Badge>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {["A", "B", "C"].map((x) => (
            <div className="rounded-lg border border-dashed p-5 text-center" key={x}>
              Variation {x}
              <p className="mt-1 text-xs text-muted-foreground">Duplicate and iterate</p>
            </div>
          ))}
        </div>
      </Box>
    </>
  );
}

function CreativeStudio() {
  const [format, setFormat] = useState("1:1");
  const [headline, setHeadline] = useState("MAKE THEM STOP.");
  const [sub, setSub] = useState("A sharp idea deserves a sharper creative.");
  const [cta, setCta] = useState("DISCOVER NOW");
  const [c1, setC1] = useState("#ff3f91");
  const [c2, setC2] = useState("#6d4aff");
  const [image, setImage] = useState<string>();
  const canvas = useRef<HTMLCanvasElement>(null);
  const sizes: any = {
    "1:1": [1080, 1080],
    "4:5": [1080, 1350],
    "9:16": [1080, 1920],
    "16:9": [1920, 1080],
    "1200x628": [1200, 628],
  };
  const render = () => {
    const c = canvas.current;
    if (!c) return;
    const [w, h] = sizes[format];
    c.width = w;
    c.height = h;
    const x = c.getContext("2d")!;
    const g = x.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
    const draw = () => {
      x.fillStyle = "rgba(5,5,12,.45)";
      x.fillRect(0, 0, w, h);
      x.fillStyle = "white";
      x.font = `900 ${Math.round(w * 0.075)}px Arial`;
      x.fillText(headline.toUpperCase(), w * 0.07, h * 0.46, w * 0.86);
      x.font = `400 ${Math.round(w * 0.027)}px Arial`;
      x.fillText(sub, w * 0.07, h * 0.53, w * 0.86);
      x.fillStyle = "#fff";
      x.fillRect(w * 0.07, h * 0.61, w * 0.28, h * 0.09);
      x.fillStyle = "#111";
      x.font = `700 ${Math.round(w * 0.024)}px Arial`;
      x.fillText(cta, w * 0.095, h * 0.667, w * 0.23);
    };
    if (image) {
      const im = new window.Image();
      im.onload = () => {
        x.drawImage(im, 0, 0, w, h);
        draw();
      };
      im.src = image;
    } else draw();
  };
  const download = (type: "png" | "jpeg") => {
    render();
    setTimeout(() => {
      const a = document.createElement("a");
      a.download = `aethron-creative.${type === "png" ? "png" : "jpg"}`;
      a.href = canvas.current!.toDataURL(`image/${type}`, 0.92);
      a.click();
    }, 80);
  };
  return (
    <>
      <Header
        eyebrow="Browser-native editor"
        title="Creative Studio"
        copy="Compose, resize, preview and export campaign-ready image ads directly on this device."
      />
      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <Box title="Creative controls">
          <div className="space-y-3">
            <label className="text-xs">
              Format
              <select
                className="mt-1 w-full rounded-md border bg-background p-2"
                value={format}
                onChange={(e) => setFormat(e.target.value)}
              >
                {Object.keys(sizes).map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            {[
              ["Headline", headline, setHeadline],
              ["Subheadline", sub, setSub],
              ["CTA", cta, setCta],
            ].map(([l, v, s]: any) => (
              <label className="block text-xs" key={l}>
                {l}
                <Input className="mt-1" value={v} onChange={(e) => s(e.target.value)} />
              </label>
            ))}
            <div className="flex gap-3">
              <input type="color" value={c1} onChange={(e) => setC1(e.target.value)} />
              <input type="color" value={c2} onChange={(e) => setC2(e.target.value)} />
            </div>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-xs">
              <Image className="size-4" />
              Background / product image
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setImage(URL.createObjectURL(f));
                }}
              />
            </label>
            <Button className="w-full" onClick={render}>
              Refresh preview
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => download("png")}>
                <Download />
                PNG
              </Button>
              <Button variant="outline" onClick={() => download("jpeg")}>
                <Download />
                JPG
              </Button>
            </div>
          </div>
        </Box>
        <Box title={`Live canvas · ${format}`}>
          <div className="grid min-h-[480px] place-items-center overflow-hidden rounded-xl bg-black/40 p-3">
            <canvas ref={canvas} className="max-h-[68vh] max-w-full rounded-lg shadow-2xl" />
          </div>
        </Box>
      </div>
    </>
  );
}

function WebsiteLab() {
  const [url, setUrl] = useState("");
  return (
    <>
      <Header
        eyebrow="Flagship workflow"
        title="Website → Campaign"
        copy="A real extraction boundary is ready. Website content is never fabricated in the browser."
      />
      <div className="mx-auto max-w-3xl">
        <Box title="Scan a website">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Link2 className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://yourbrand.com"
                className="pl-9"
              />
            </div>
            <Button disabled={!integrations.website || !url}>Scan website</Button>
          </div>
          <div className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm">
            <b>Requires server integration.</b> Cross-origin website extraction, normalization and
            model analysis must run through the typed <code>WebsiteExtractionService</code>. No
            sample scan is substituted.
          </div>
        </Box>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            "Extract brand",
            "Find products",
            "Identify offer",
            "Map audience",
            "Read style",
            "Suggest angles",
            "Create campaign",
            "Generate creatives",
          ].map((x, i) => (
            <div className="rounded-lg border p-3 text-xs" key={x}>
              <span className="mr-2 font-mono text-primary">0{i + 1}</span>
              {x}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Content() {
  return (
    <>
      <Header
        eyebrow="Social content machine"
        title="Content engine"
        copy="Plan posts, captions, scripts and publishing states across every major channel."
        action={
          <Button>
            <Plus />
            New content
          </Button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
        <Box title="Content pillars">
          <div className="space-y-2">
            {["Educate", "Inspire", "Demonstrate", "Convert"].map((x) => (
              <div className="rounded-lg border p-3" key={x}>
                {x}
              </div>
            ))}
          </div>
        </Box>
        <Box title="Calendar">
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 28 }, (_, i) => (
              <div
                className="min-h-20 rounded border p-2 text-[10px] text-muted-foreground"
                key={i}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </Box>
      </div>
      <Box title="Production queue" className="mt-4">
        <div className="grid gap-3 sm:grid-cols-4">
          {["Draft", "Ready", "Scheduled", "Published"].map((x) => (
            <div key={x}>
              <Badge variant="outline">{x}</Badge>
              <div className="mt-2 min-h-28 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                Drop content here
              </div>
            </div>
          ))}
        </div>
      </Box>
    </>
  );
}

function Agency({ state, setState }: any) {
  const [tab, setTab] = useState("Clients");
  const [r, setR] = useState({
    advertiser: "",
    url: "",
    source: "",
    status: "Lead",
    estimated: "",
    actual: "",
  });
  const add = () => {
    if (r.advertiser)
      setState({ ...state, referrals: [...state.referrals, { ...r, id: crypto.randomUUID() }] });
  };
  return (
    <>
      <Header
        eyebrow="Operations layer"
        title="Agency OS"
        copy="Private client operations today; roles, client portals, approvals, subscriptions and white-label reporting tomorrow."
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {["Clients", "Briefs", "Deliverables", "Approvals", "Affiliate / Partner"].map((x) => (
          <Button key={x} variant={tab === x ? "default" : "outline"} onClick={() => setTab(x)}>
            {x}
          </Button>
        ))}
      </div>
      {tab === "Affiliate / Partner" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Box title="TikTok referral">
            <div className="space-y-3">
              {Object.entries(r).map(([k, v]) => (
                <label className="block text-xs capitalize" key={k}>
                  {k}
                  <Input
                    className="mt-1"
                    value={v}
                    onChange={(e) => setR({ ...r, [k]: e.target.value })}
                  />
                </label>
              ))}
              <Button onClick={add}>
                <Plus />
                Track referral
              </Button>
            </div>
          </Box>
          <Box title="Affiliate dashboard">
            {state.referrals.length ? (
              state.referrals.map((x: any) => (
                <div className="mb-2 rounded-lg border p-3" key={x.id}>
                  <b>{x.advertiser}</b>
                  <div className="text-xs text-muted-foreground">
                    {x.source} · {x.status}
                  </div>
                  <div className="mt-2 font-mono text-xs">
                    Estimated {x.estimated || "—"} / Actual {x.actual || "—"}
                  </div>
                </div>
              ))
            ) : (
              <Empty
                title="No referrals tracked"
                copy="Store referral URLs, sources, lead states and commissions without inventing conversion results."
              />
            )}
          </Box>
        </div>
      ) : tab === "Approvals" ? (
        <Box title="Approval workflow">
          <div className="grid gap-3 sm:grid-cols-5">
            {["Draft", "Internal Review", "Client Review", "Changes Requested", "Approved"].map(
              (x) => (
                <div className="min-h-32 rounded-lg border border-dashed p-3 text-xs" key={x}>
                  {x}
                </div>
              ),
            )}
          </div>
        </Box>
      ) : tab === "Briefs" ? (
        <Box title="Client brief builder">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              "Business",
              "Website",
              "Product",
              "Goal",
              "Audience",
              "Offer",
              "Budget",
              "Deadline",
              "Platforms",
              "Brand requirements",
              "Competitors",
              "Inspiration",
              "Assets",
              "Notes",
            ].map((x) => (
              <label className="text-xs" key={x}>
                {x}
                <Input className="mt-1" />
              </label>
            ))}
          </div>
          <Button className="mt-4">Create campaign workspace</Button>
        </Box>
      ) : (
        <Empty
          title={`${tab} workspace`}
          copy="The local/private data foundation is ready for client association, files, notes and deliverables."
          action={`Add ${tab.toLowerCase()}`}
        />
      )}
      <Box title="TikTok client onboarding" className="mt-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {[
            "New client",
            "Referral",
            "Advertiser registration",
            "Business Center",
            "Ad account",
            "Campaign brief",
            "Creative production",
            "Launch",
            "Reporting",
          ].map((x, i) => (
            <span className="flex items-center gap-2" key={x}>
              <Badge variant="outline">
                {i + 1}. {x}
              </Badge>
              {i < 8 && <ArrowRight className="size-3" />}
            </span>
          ))}
        </div>
      </Box>
    </>
  );
}

function SettingsPage() {
  return (
    <>
      <Header
        eyebrow="System"
        title="Studio settings"
        copy="Private access remains enforced by the existing Supabase admin allowlist."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Box title="Security">
          <div className="flex items-start gap-3">
            <LockKeyhole className="text-primary" />
            <div>
              <b>Admin-only access active</b>
              <p className="mt-1 text-sm text-muted-foreground">
                Unauthorized users are signed out by the protected route before any studio module
                loads.
              </p>
            </div>
          </div>
        </Box>
        <Box title="Integration readiness">
          <div className="space-y-2">
            {Object.entries(integrations).map(([k, v]) => (
              <div className="flex justify-between rounded-lg border p-3 text-sm" key={k}>
                <span className="capitalize">{k}</span>
                <Badge variant="outline">{v ? "Connected" : "Not configured"}</Badge>
              </div>
            ))}
          </div>
        </Box>
        <Box title="Future plans">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {["Free / Trial", "Creator", "Pro", "Agency"].map((x) => (
              <div className="rounded-lg border p-4 text-center text-sm" key={x}>
                {x}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Metering model: brands, campaigns, generations, scans, storage, team members and
            clients. Billing is intentionally not enabled.
          </p>
        </Box>
        <Box title="Provider architecture">
          <div className="flex flex-wrap gap-2">
            {["TikTok", "Meta", "Google", "YouTube", "X", "LinkedIn", "Pinterest"].map((x) => (
              <Badge key={x} variant="outline">
                {x}
              </Badge>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Credentials, authorization callbacks, webhooks and tokens belong server-side.
          </p>
        </Box>
      </div>
    </>
  );
}
