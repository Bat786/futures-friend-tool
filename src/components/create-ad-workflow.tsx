import { useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Download,
  FileJson,
  ImagePlus,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formats, generateCreativePack, goals, stylePresets } from "@/lib/creative-templates";
import type { Brand, Campaign, CreativePack, StudioState } from "@/lib/studio-data";

const steps = ["Brand", "Goal", "Style", "Format", "Offer", "Creative pack"];
const fieldClass = "mt-1";
const download = (name: string, content: string, type = "text/plain") => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
};
const copy = async (text: string) => {
  await navigator.clipboard.writeText(text);
  toast.success("Copied to clipboard");
};

export function CreateAdWorkflow({
  state,
  setState,
}: {
  state: StudioState;
  setState: (s: StudioState) => void;
}) {
  const [step, setStep] = useState(0);
  const [brandId, setBrandId] = useState(state.brands[0]?.id || "");
  const [goal, setGoal] = useState(goals[0]!);
  const [style, setStyle] = useState<keyof typeof stylePresets>("UGC");
  const [format, setFormat] = useState(formats[0]!);
  const [product, setProduct] = useState({
    productTitle: "Hero Product",
    productUrl: "",
    price: "$49",
    offer: "20% off this week",
    cta: "Shop now",
    description: "A simple, premium solution designed to make the everyday experience better.",
  });
  const [assets, setAssets] = useState<string[]>([]);
  const [pack, setPack] = useState<CreativePack>();
  const brand = state.brands.find((b) => b.id === brandId) || state.brands[0];
  const suggestion = stylePresets[style];
  const setProductField = (key: keyof typeof product, value: string) =>
    setProduct((x) => ({ ...x, [key]: value }));
  const generate = () => {
    if (!brand) return;
    setPack(generateCreativePack({ brand, goal, style, format, ...product, assetNames: assets }));
    setStep(5);
    toast.success("Template creative pack generated locally");
  };
  const savePack = (next = pack) => {
    if (!next) return;
    const saved = { ...next, updatedAt: new Date().toISOString() };
    setPack(saved);
    setState({ ...state, creatives: [saved, ...state.creatives.filter((x) => x.id !== saved.id)] });
    toast.success("Draft saved on this device");
  };
  const updatePack = (key: keyof CreativePack, value: unknown) =>
    pack && setPack({ ...pack, [key]: value, updatedAt: new Date().toISOString() });
  return (
    <div className="mx-auto max-w-7xl">
      <div className="relative mb-5 overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/20 via-card to-ai/15 p-5 sm:p-7">
        <div className="absolute -right-12 -top-16 size-48 rounded-full bg-primary/20 blur-3xl" />
        <Badge className="mb-3" variant="outline">
          <Sparkles className="mr-1 size-3" /> Local template engine
        </Badge>
        <h1 className="text-3xl font-bold sm:text-4xl">Create an ad that’s ready to make.</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Build a complete, editable creative pack with deterministic templates—no paid API or
          simulated AI.
        </p>
      </div>
      <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl border bg-card/70 p-1.5">
        {steps.map((name, i) => (
          <button
            key={name}
            onClick={() => (pack || i < 5 ? setStep(i) : undefined)}
            className={`flex min-w-max flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${step === i ? "bg-primary text-primary-foreground shadow-lg" : i < step ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
          >
            <span className="grid size-5 place-items-center rounded-full border text-[10px]">
              {i < step ? <Check className="size-3" /> : i + 1}
            </span>
            {name}
          </button>
        ))}
      </div>
      {step === 0 && brand && (
        <Panel
          title="Choose your brand"
          copy="Starter profiles are ready to use or customize from Brands."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {state.brands.map((b) => (
              <button
                key={b.id}
                onClick={() => setBrandId(b.id)}
                className={`rounded-xl border p-4 text-left transition ${brandId === b.id ? "border-primary bg-primary/10 ring-1 ring-primary" : "hover:border-primary/50"}`}
              >
                <div className="mb-4 flex items-center gap-3">
                  <div
                    className="grid size-11 place-items-center rounded-xl text-lg font-black"
                    style={{
                      background: `linear-gradient(135deg, ${b.colors[0]}, ${b.colors[1]})`,
                    }}
                  >
                    {b.name[0]}
                  </div>
                  <div>
                    <b>{b.name}</b>
                    <p className="text-xs text-muted-foreground">{b.industry}</p>
                  </div>
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">{b.valueProposition}</p>
                <div className="mt-3 flex gap-1">
                  {b.colors.map((c) => (
                    <i key={c} className="size-4 rounded-full" style={{ background: c }} />
                  ))}
                </div>
              </button>
            ))}
          </div>
        </Panel>
      )}
      {step === 1 && (
        <Panel
          title="What should this campaign achieve?"
          copy="Choose one focused outcome for the creative."
        >
          <ChoiceGrid values={goals} selected={goal} setSelected={setGoal} />
        </Panel>
      )}
      {step === 2 && (
        <Panel
          title="Pick a creative style"
          copy="Every preset sets the hook, tone, CTA, pacing and shot direction."
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {(Object.keys(stylePresets) as Array<keyof typeof stylePresets>).map((s) => (
              <button
                key={s}
                onClick={() => setStyle(s)}
                className={`group overflow-hidden rounded-xl border text-left transition ${style === s ? "border-primary bg-primary/10 ring-1 ring-primary" : "hover:border-ai/60"}`}
              >
                <div
                  className={`h-16 bg-gradient-to-br ${["from-pink-500/50 to-violet-600/20", "from-cyan-500/40 to-blue-700/20", "from-amber-400/40 to-red-600/20"][Object.keys(stylePresets).indexOf(s) % 3]}`}
                />
                <div className="p-4">
                  <b>{s}</b>
                  <p className="mt-1 text-xs text-muted-foreground">{stylePresets[s][0]}</p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    <Badge variant="outline">{stylePresets[s][3]}</Badge>
                    <Badge variant="outline">{stylePresets[s][1]}</Badge>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Panel>
      )}
      {step === 3 && (
        <Panel
          title="Choose the production format"
          copy="The pack will adapt its direction for the selected placement."
        >
          <ChoiceGrid values={formats} selected={format} setSelected={setFormat} large />
        </Panel>
      )}
      {step === 4 && (
        <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
          <Panel
            title="Product & offer"
            copy="Start with the example, then replace only what matters."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["productTitle", "Product title"],
                  ["productUrl", "Product URL"],
                  ["price", "Price"],
                  ["offer", "Offer / discount"],
                  ["cta", "CTA"],
                ] as const
              ).map(([k, l]) => (
                <label key={k} className="text-xs text-muted-foreground">
                  {l}
                  <Input
                    className={fieldClass}
                    value={product[k]}
                    onChange={(e) => setProductField(k, e.target.value)}
                  />
                </label>
              ))}
              <label className="text-xs text-muted-foreground sm:col-span-2">
                Product description
                <Textarea
                  className={fieldClass}
                  rows={4}
                  value={product.description}
                  onChange={(e) => setProductField("description", e.target.value)}
                />
              </label>
            </div>
            <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed p-5 text-sm hover:border-primary">
              <ImagePlus className="size-5 text-primary" /> Upload / attach product images
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) =>
                  setAssets([...assets, ...Array.from(e.target.files || []).map((f) => f.name)])
                }
              />
            </label>
            {assets.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {assets.map((x) => (
                  <Badge key={x}>{x}</Badge>
                ))}
              </div>
            )}
          </Panel>
          <Panel
            title="Preset recipe"
            copy="These instructions are applied by the local generator."
          >
            <Recipe suggestion={suggestion} />
            <div className="mt-6 rounded-xl border border-warning/30 bg-warning/10 p-4 text-xs">
              <b>Honest generation:</b> output is assembled from deterministic templates and your
              inputs. No external AI is connected.
            </div>
          </Panel>
        </div>
      )}
      {step === 5 && pack && (
        <Workspace
          pack={pack}
          updatePack={updatePack}
          savePack={savePack}
          state={state}
          setState={setState}
          regenerate={generate}
        />
      )}
      {step < 5 && (
        <div className="mt-5 flex justify-between">
          <Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>
            <ChevronLeft /> Back
          </Button>
          {step < 4 ? (
            <Button onClick={() => setStep(step + 1)}>
              Continue <ChevronRight />
            </Button>
          ) : (
            <Button onClick={generate}>
              <Sparkles /> Generate creative pack
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function Panel({
  title,
  copy: description,
  children,
}: {
  title: string;
  copy: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="panel">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
function ChoiceGrid({
  values,
  selected,
  setSelected,
  large = false,
}: {
  values: string[];
  selected: string;
  setSelected: (x: string) => void;
  large?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {values.map((x) => (
        <button
          key={x}
          onClick={() => setSelected(x)}
          className={`${large ? "min-h-28" : "min-h-20"} rounded-xl border p-4 text-left font-semibold transition ${selected === x ? "border-primary bg-primary/15 text-primary ring-1 ring-primary" : "hover:border-primary/50"}`}
        >
          {x}
          {selected === x && <Check className="mt-2 size-4" />}
        </button>
      ))}
    </div>
  );
}
function Recipe({ suggestion }: { suggestion: readonly string[] }) {
  return (
    <div className="space-y-3">
      {["Hook structure", "Script tone", "Suggested CTA", "Pacing", "Shot style"].map((x, i) => (
        <div key={x} className="rounded-lg bg-muted/50 p-3">
          <Label className="text-[10px] uppercase tracking-widest text-primary">{x}</Label>
          <p className="mt-1 text-sm">{suggestion[i]}</p>
        </div>
      ))}
    </div>
  );
}

function Workspace({
  pack,
  updatePack,
  savePack,
  state,
  setState,
  regenerate,
}: {
  pack: CreativePack;
  updatePack: (k: keyof CreativePack, v: unknown) => void;
  savePack: (p?: CreativePack) => void;
  state: StudioState;
  setState: (s: StudioState) => void;
  regenerate: () => void;
}) {
  const allText = useMemo(
    () =>
      [
        pack.name,
        ...pack.hooks,
        pack.primaryScript,
        ...pack.scriptVariants,
        ...pack.shots,
        ...pack.onScreenText,
        pack.caption,
        ...pack.ctaOptions,
        ...pack.hashtags,
        ...pack.headlines,
      ].join("\n\n"),
    [pack],
  );
  const [campaign, setCampaign] = useState({
    name: pack.name,
    platform: pack.format.split(" ")[0],
    dueDate: "",
    budget: "",
    notes: "",
  });
  const schedule = () => {
    const date = prompt("Schedule date (YYYY-MM-DD)", new Date().toISOString().slice(0, 10));
    if (!date) return;
    setState({
      ...state,
      creatives: [pack, ...state.creatives.filter((x) => x.id !== pack.id)],
      calendar: [
        {
          id: crypto.randomUUID(),
          creativeId: pack.id,
          title: pack.name,
          date,
          platform: campaign.platform,
          status: "Scheduled",
        },
        ...state.calendar,
      ],
    });
    toast.success("Added to local content calendar");
  };
  const createCampaign = () => {
    const c: Campaign = {
      id: crypto.randomUUID(),
      brandId: pack.brandId,
      name: campaign.name,
      product: pack.productTitle,
      offer: pack.offer,
      objective: pack.goal,
      audience: "",
      platform: campaign.platform,
      funnel: "Conversion",
      tone: pack.style,
      cta: pack.cta,
      budget: campaign.budget,
      dates: campaign.dueDate,
      notes: campaign.notes,
      status: "Draft",
      updatedAt: new Date().toISOString(),
      creativeIds: [pack.id],
      dueDate: campaign.dueDate,
    };
    setState({
      ...state,
      creatives: [pack, ...state.creatives.filter((x) => x.id !== pack.id)],
      campaigns: [c, ...state.campaigns],
    });
    toast.success("Creative saved to a new campaign");
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Badge variant="outline">Template-generated</Badge>
          <h2 className="mt-2 text-2xl font-bold">{pack.name}</h2>
          <p className="text-xs text-muted-foreground">
            {pack.style} · {pack.format} · {pack.goal}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={regenerate}>
            <RefreshCw /> Regenerate
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              savePack({
                ...pack,
                id: crypto.randomUUID(),
                name: pack.name + " Copy",
                createdAt: new Date().toISOString(),
              })
            }
          >
            <Plus /> Duplicate
          </Button>
          <Button onClick={() => savePack()}>
            <Save /> Save draft
          </Button>
        </div>
      </div>
      <Tabs defaultValue="script">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="script">Scripts</TabsTrigger>
          <TabsTrigger value="storyboard">Storyboard</TabsTrigger>
          <TabsTrigger value="copy">Copy kit</TabsTrigger>
          <TabsTrigger value="variants">A/B/C</TabsTrigger>
          <TabsTrigger value="campaign">Campaign & schedule</TabsTrigger>
        </TabsList>
        <TabsContent value="script">
          <div className="grid gap-4 lg:grid-cols-[.75fr_1.25fr]">
            <Panel title="5 hooks" copy="Click any hook to copy it.">
              <div className="space-y-2">
                {pack.hooks.map((h, i) => (
                  <button
                    key={i}
                    onClick={() => copy(h)}
                    className="w-full rounded-lg border p-3 text-left text-sm hover:border-primary"
                  >
                    <Badge className="mr-2" variant="outline">
                      0{i + 1}
                    </Badge>
                    {h}
                  </button>
                ))}
              </div>
            </Panel>
            <Panel title="Editable scripts" copy="Primary plus three production-ready directions.">
              <Label>Primary script</Label>
              <Textarea
                rows={6}
                value={pack.primaryScript}
                onChange={(e) => updatePack("primaryScript", e.target.value)}
              />
              <div className="mt-4 space-y-3">
                {pack.scriptVariants.map((s, i) => (
                  <Textarea
                    key={i}
                    rows={4}
                    value={s}
                    onChange={(e) =>
                      updatePack(
                        "scriptVariants",
                        pack.scriptVariants.map((x, j) => (j === i ? e.target.value : x)),
                      )
                    }
                  />
                ))}
              </div>
            </Panel>
          </div>
        </TabsContent>
        <TabsContent value="storyboard">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {pack.storyboard.map((scene, i) => (
              <Card key={scene.id} className="overflow-hidden">
                <div className="aspect-[9/12] bg-gradient-to-br from-primary/30 via-ai/10 to-black p-4">
                  <Badge>{scene.seconds}s</Badge>
                  <div className="mt-14 text-center text-3xl font-black opacity-30">0{i + 1}</div>
                </div>
                <CardContent className="space-y-2 p-3">
                  <Input
                    value={scene.visual}
                    onChange={(e) =>
                      updatePack(
                        "storyboard",
                        pack.storyboard.map((x) =>
                          x.id === scene.id ? { ...x, visual: e.target.value } : x,
                        ),
                      )
                    }
                  />
                  <Textarea
                    rows={3}
                    value={scene.text}
                    onChange={(e) =>
                      updatePack(
                        "storyboard",
                        pack.storyboard.map((x) =>
                          x.id === scene.id ? { ...x, text: e.target.value } : x,
                        ),
                      )
                    }
                  />
                </CardContent>
              </Card>
            ))}
          </div>
          <Button
            className="mt-3"
            variant="outline"
            onClick={() =>
              download(
                `${pack.name}.storyboard.json`,
                JSON.stringify(pack.storyboard, null, 2),
                "application/json",
              )
            }
          >
            <FileJson /> Export JSON
          </Button>
          <Button
            className="ml-2 mt-3"
            variant="outline"
            onClick={() =>
              download(
                `${pack.name}.storyboard.csv`,
                [
                  "seconds,beat,visual,text",
                  ...pack.storyboard.map((x) =>
                    [x.seconds, x.beat, x.visual, x.text]
                      .map((v) => `"${v.replaceAll('"', '""')}"`)
                      .join(","),
                  ),
                ].join("\n"),
                "text/csv",
              )
            }
          >
            <Download /> Export CSV
          </Button>
        </TabsContent>
        <TabsContent value="copy">
          <div className="grid gap-4 md:grid-cols-2">
            <Panel title="Caption" copy="Editable social caption.">
              <Textarea
                rows={7}
                value={pack.caption}
                onChange={(e) => updatePack("caption", e.target.value)}
              />
              <Button
                className="mt-2"
                size="sm"
                variant="outline"
                onClick={() => copy(pack.caption)}
              >
                <Clipboard /> Copy
              </Button>
            </Panel>
            <Panel
              title="On-screen text & headlines"
              copy="Text overlays, CTA options and placeholders."
            >
              <div className="space-y-2">
                {[
                  ...pack.onScreenText,
                  ...pack.headlines,
                  ...pack.ctaOptions,
                  ...pack.hashtags,
                ].map((x, i) => (
                  <button
                    key={i}
                    onClick={() => copy(x)}
                    className="mr-2 rounded-full border px-3 py-1.5 text-xs hover:border-primary"
                  >
                    {x}
                  </button>
                ))}
              </div>
            </Panel>
          </div>
        </TabsContent>
        <TabsContent value="variants">
          <div className="grid gap-3 md:grid-cols-3">
            {pack.variations.map((v, i) => (
              <Card key={v.name} className={i === 0 ? "border-primary" : ""}>
                <CardHeader>
                  <Badge className="w-fit">{v.name}</Badge>
                  <CardTitle className="text-lg">{v.hook}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{v.angle}</p>
                  <Button className="mt-5 w-full">{v.cta}</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="campaign">
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel
              title="Attach to a campaign"
              copy="Creates a local campaign with this creative linked."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs">
                  Campaign name
                  <Input
                    value={campaign.name}
                    onChange={(e) => setCampaign({ ...campaign, name: e.target.value })}
                  />
                </label>
                <label className="text-xs">
                  Platform
                  <Input
                    value={campaign.platform}
                    onChange={(e) => setCampaign({ ...campaign, platform: e.target.value })}
                  />
                </label>
                <label className="text-xs">
                  Due date
                  <Input
                    type="date"
                    value={campaign.dueDate}
                    onChange={(e) => setCampaign({ ...campaign, dueDate: e.target.value })}
                  />
                </label>
                <label className="text-xs">
                  Budget placeholder
                  <Input
                    placeholder="$—"
                    value={campaign.budget}
                    onChange={(e) => setCampaign({ ...campaign, budget: e.target.value })}
                  />
                </label>
                <label className="text-xs sm:col-span-2">
                  Notes
                  <Textarea
                    value={campaign.notes}
                    onChange={(e) => setCampaign({ ...campaign, notes: e.target.value })}
                  />
                </label>
              </div>
              <Button className="mt-4" onClick={createCampaign}>
                <Plus /> Create campaign
              </Button>
            </Panel>
            <Panel
              title="Finish & distribute"
              copy="Approve, export, or add this creative to your queue."
            >
              <div className="grid gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    updatePack("status", "Approved");
                    savePack({ ...pack, status: "Approved" });
                  }}
                >
                  <Check /> Mark approved
                </Button>
                <Button variant="outline" onClick={() => download(`${pack.name}.txt`, allText)}>
                  <Download /> Export all text
                </Button>
                <Button onClick={schedule}>Schedule to content calendar</Button>
              </div>
            </Panel>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
