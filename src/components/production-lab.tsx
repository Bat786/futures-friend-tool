import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Copy, Download, Plus, Trash2 } from "lucide-react";
import { StudioShell } from "@/components/studio-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Scene = {
  id: string;
  duration: number;
  visual: string;
  camera: string;
  dialogue: string;
  voiceover: string;
  overlay: string;
  audio: string;
  cta: string;
};

const concepts = [
  "UGC ad",
  "Problem → Solution",
  "Before / After",
  "Founder story",
  "Product demo",
  "Unboxing",
  "Review / testimonial",
  "POV",
  "Listicle",
  "Educational",
  "Storytime",
  "Trend adaptation",
  "Offer ad",
  "Retargeting ad",
];
const durations = [6, 10, 15, 20, 30, 45, 60];
const emptyScene = (): Scene => ({
  id: crypto.randomUUID(),
  duration: 3,
  visual: "",
  camera: "",
  dialogue: "",
  voiceover: "",
  overlay: "",
  audio: "",
  cta: "",
});

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="panel">
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
function Heading({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return (
    <div className="mb-6">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{copy}</p>
    </div>
  );
}
function Field({
  label,
  value,
  onChange,
  area = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  area?: boolean;
}) {
  const props = {
    value,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(event.target.value),
    className: "mt-1",
  };
  return (
    <label className="block text-xs text-muted-foreground">
      {label}
      {area ? <Textarea {...props} rows={3} /> : <Input {...props} />}
    </label>
  );
}

export function ProductionLab({ mode }: { mode: "tiktok" | "scripts" | "storyboard" }) {
  return (
    <StudioShell>
      {mode === "tiktok" ? <TikTokLab /> : mode === "scripts" ? <ScriptStudio /> : <Storyboard />}
    </StudioShell>
  );
}

function TikTokLab() {
  const [template, setTemplate] = useState(concepts[0]);
  const [duration, setDuration] = useState(15);
  const [brief, setBrief] = useState({
    hook: "",
    scene: "",
    voiceover: "",
    overlay: "",
    broll: "",
    cta: "",
  });
  return (
    <>
      <Heading
        eyebrow="TikTok-first planning"
        title="TikTok Ad Lab"
        copy="Build platform-native concepts locally. Nothing here is published or connected to a TikTok advertiser account."
      />
      <div className="grid gap-4 xl:grid-cols-[280px_1fr]">
        <Panel title="Concept template">
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-1">
            {concepts.map((item) => (
              <Button
                key={item}
                variant={template === item ? "default" : "outline"}
                className="justify-start"
                onClick={() => setTemplate(item)}
              >
                {item}
              </Button>
            ))}
          </div>
        </Panel>
        <div className="space-y-4">
          <Panel title={`${template} brief`}>
            <div className="mb-4 flex flex-wrap gap-2">
              {durations.map((item) => (
                <Button
                  size="sm"
                  key={item}
                  variant={duration === item ? "default" : "outline"}
                  onClick={() => setDuration(item)}
                >
                  {item}s
                </Button>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(brief).map(([key, value]) => (
                <Field
                  key={key}
                  label={key === "broll" ? "B-ROLL" : key.toUpperCase()}
                  value={value}
                  area={key !== "cta" && key !== "hook"}
                  onChange={(next) => setBrief({ ...brief, [key]: next })}
                />
              ))}
            </div>
          </Panel>
          <Panel title="9:16 safe-zone check">
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-lg border p-3">
                <b>Top</b>
                <p className="text-muted-foreground">Keep key copy below app controls.</p>
              </div>
              <div className="rounded-lg border p-3">
                <b>Right edge</b>
                <p className="text-muted-foreground">Reserve space for engagement UI.</p>
              </div>
              <div className="rounded-lg border p-3">
                <b>Bottom</b>
                <p className="text-muted-foreground">Keep CTA above captions and navigation.</p>
              </div>
            </div>
            <Badge variant="outline" className="mt-3">
              Local planning · {duration}s · 9:16
            </Badge>
          </Panel>
        </div>
      </div>
    </>
  );
}

function ScriptStudio() {
  const [type, setType] = useState("TikTok script");
  const [parts, setParts] = useState({ hook: "", body: "", proof: "", offer: "", cta: "" });
  const text = Object.values(parts).join(" ").trim();
  const words = text ? text.split(/\s+/).length : 0;
  const seconds = Math.ceil(words / 2.5);
  const download = () => {
    const body = `${type}\n\n${Object.entries(parts)
      .map(([key, value]) => `${key.toUpperCase()}\n${value}`)
      .join("\n\n")}`;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([body], { type: "text/plain" }));
    link.download = `${type.toLowerCase().replaceAll(" ", "-")}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  };
  return (
    <>
      <Heading
        eyebrow="Reusable writing workflow"
        title="Script Studio"
        copy="Write structured short-form, commercial, testimonial and voiceover scripts without requiring an AI provider."
      />
      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <Panel title="Script type">
          <div className="space-y-2">
            {[
              "TikTok script",
              "UGC script",
              "Commercial",
              "Voiceover",
              "Product demo",
              "Testimonial",
              "Organic post",
              "Short-form video",
            ].map((item) => (
              <Button
                className="w-full justify-start"
                key={item}
                variant={type === item ? "default" : "outline"}
                onClick={() => setType(item)}
              >
                {item}
              </Button>
            ))}
          </div>
        </Panel>
        <Panel title={type}>
          <div className="space-y-3">
            {Object.entries(parts).map(([key, value]) => (
              <Field
                key={key}
                label={key.toUpperCase()}
                value={value}
                area
                onChange={(next) => setParts({ ...parts, [key]: next })}
              />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge variant="outline">{words} words</Badge>
            <Badge variant="outline">~{seconds}s voiceover</Badge>
            <Badge variant="outline">{text.length} characters</Badge>
            <Button className="ml-auto" onClick={download}>
              <Download />
              Export .txt
            </Button>
          </div>
        </Panel>
      </div>
    </>
  );
}

function Storyboard() {
  const [title, setTitle] = useState("Untitled storyboard");
  const [scenes, setScenes] = useState<Scene[]>(
    ["scene-1", "scene-2", "scene-3"].map((id) => ({ ...emptyScene(), id })),
  );
  const [storageReady, setStorageReady] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("aethron-storyboard-v1");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setTitle(parsed.title);
        setScenes(parsed.scenes);
      } catch {
        /* retain a clean draft */
      }
    }
    setStorageReady(true);
  }, []);
  useEffect(() => {
    if (storageReady) {
      localStorage.setItem("aethron-storyboard-v1", JSON.stringify({ title, scenes }));
    }
  }, [storageReady, title, scenes]);
  const total = useMemo(
    () => scenes.reduce((sum, scene) => sum + Number(scene.duration || 0), 0),
    [scenes],
  );
  const update = (id: string, patch: Partial<Scene>) =>
    setScenes(scenes.map((scene) => (scene.id === id ? { ...scene, ...patch } : scene)));
  const move = (index: number, by: number) => {
    const next = [...scenes];
    const target = index + by;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setScenes(next);
  };
  const preset = (seconds: number) =>
    setScenes(
      Array.from({ length: seconds <= 15 ? 5 : seconds <= 30 ? 6 : 8 }, () => ({
        ...emptyScene(),
        duration: seconds / (seconds <= 15 ? 5 : seconds <= 30 ? 6 : 8),
      })),
    );
  const exportJson = () => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob([JSON.stringify({ title, totalDuration: total, scenes }, null, 2)], {
        type: "application/json",
      }),
    );
    link.download = "aethron-storyboard.json";
    link.click();
    URL.revokeObjectURL(link.href);
  };
  return (
    <>
      <Heading
        eyebrow="Visual production plan"
        title="Storyboard Builder"
        copy="Plan every shot, calculate runtime and export a production-ready local storyboard."
      />
      <Panel title="Project controls">
        <div className="flex flex-wrap gap-2">
          <Input
            className="min-w-56 flex-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          {[15, 30, 60].map((seconds) => (
            <Button variant="outline" key={seconds} onClick={() => preset(seconds)}>
              {seconds}s preset
            </Button>
          ))}
          <Button onClick={() => setScenes([...scenes, emptyScene()])}>
            <Plus />
            Add scene
          </Button>
          <Button variant="outline" onClick={exportJson}>
            <Download />
            JSON
          </Button>
        </div>
        <div className="mt-3 flex gap-2">
          <Badge>{scenes.length} scenes</Badge>
          <Badge variant="outline">{total}s total</Badge>
          <Badge variant="outline">Saved locally</Badge>
        </div>
      </Panel>
      <div className="mt-4 space-y-3">
        {scenes.map((scene, index) => (
          <Panel key={scene.id} title={`Scene ${index + 1} · ${scene.duration}s`}>
            <div className="mb-3 flex flex-wrap justify-end gap-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => move(index, -1)}
                aria-label="Move scene up"
              >
                <ArrowUp />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => move(index, 1)}
                aria-label="Move scene down"
              >
                <ArrowDown />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() =>
                  setScenes([
                    ...scenes.slice(0, index + 1),
                    { ...scene, id: crypto.randomUUID() },
                    ...scenes.slice(index + 1),
                  ])
                }
                aria-label="Duplicate scene"
              >
                <Copy />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setScenes(scenes.filter((item) => item.id !== scene.id))}
                aria-label="Delete scene"
              >
                <Trash2 />
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-xs text-muted-foreground">
                DURATION (SECONDS)
                <Input
                  className="mt-1"
                  min="0"
                  step="0.5"
                  type="number"
                  value={scene.duration}
                  onChange={(e) => update(scene.id, { duration: Number(e.target.value) })}
                />
              </label>
              {(
                ["visual", "camera", "dialogue", "voiceover", "overlay", "audio", "cta"] as const
              ).map((key) => (
                <Field
                  key={key}
                  label={key === "audio" ? "MUSIC / SFX" : key.toUpperCase()}
                  value={scene[key]}
                  area={key === "visual" || key === "voiceover"}
                  onChange={(value) => update(scene.id, { [key]: value })}
                />
              ))}
            </div>
          </Panel>
        ))}
      </div>
    </>
  );
}
