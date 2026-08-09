import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { LayoutGrid, Plus, Save } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PanelFrame } from "@/components/workspace/panel-frame";
import { PanelBody } from "@/components/workspace/panel-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { TIMEFRAMES, WATCHLIST, type Timeframe } from "@/lib/market";
import { listLayouts, saveLayout } from "@/lib/workspace.functions";
import {
  addPanel,
  DEFAULT_LAYOUT,
  movePanel,
  PANEL_IDS,
  PANEL_META,
  removePanel,
  type PanelId,
  type WorkspaceLayout,
} from "@/lib/workspace-layouts";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/workspace")({
  head: () => ({
    meta: [
      { title: "Workspace — AETHRA modular trading command center" },
      {
        name: "description",
        content:
          "Arrange chart, signal, positions, risk, scanner, news and AI panels into a resizable workspace and save layouts per strategy.",
      },
      { property: "og:title", content: "Workspace — AETHRA modular trading command center" },
      {
        property: "og:description",
        content: "A drag-and-drop, resizable futures trading workspace with saved layout presets.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WorkspacePage,
});

function WorkspacePage() {
  const qc = useQueryClient();
  const [symbol, setSymbol] = useState("MES");
  const [timeframe, setTimeframe] = useState<Timeframe>("5m");
  const [layout, setLayout] = useState<WorkspaceLayout>(DEFAULT_LAYOUT);
  const [activeName, setActiveName] = useState("Default");
  const [maximized, setMaximized] = useState<PanelId | null>(null);
  const [dragging, setDragging] = useState<PanelId | null>(null);

  const layouts = useQuery({ queryKey: ["workspace-layouts"], queryFn: () => listLayouts() });

  useEffect(() => {
    const saved = layouts.data?.layouts;
    if (!saved?.length) return;
    const preferred = saved.find((l) => l.is_default) ?? saved[0]!;
    setLayout(preferred.panels);
    setActiveName(preferred.name);
  }, [layouts.data]);

  const save = useMutation({
    mutationFn: (input: { name: string; panels: WorkspaceLayout; isDefault: boolean }) =>
      saveLayout({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-layouts"] });
      toast.success(`Layout "${activeName}" saved`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const used = useMemo(() => new Set(layout.columns.flatMap((c) => c.panels)), [layout]);
  const available = PANEL_IDS.filter((p) => !used.has(p));
  const ctx = { symbol, timeframe };

  const drop = (columnId: string, index: number) => {
    if (!dragging) return;
    setLayout((l) => movePanel(l, dragging, columnId, index));
    setDragging(null);
  };

  return (
    <AppShell>
      <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <p className="eyebrow">Command center</p>
          <h2 className="truncate font-display text-xl font-semibold tracking-tight">{activeName}</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-border bg-card p-0.5">
            {WATCHLIST.map((s) => (
              <button
                key={s}
                onClick={() => setSymbol(s)}
                className={cn(
                  "rounded-sm px-2.5 py-1.5 font-mono text-xs transition-colors",
                  s === symbol
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex rounded-md border border-border bg-card p-0.5">
            {TIMEFRAMES.map((t) => (
              <button
                key={t.value}
                onClick={() => setTimeframe(t.value)}
                className={cn(
                  "rounded-sm px-2.5 py-1.5 font-mono text-xs transition-colors",
                  t.value === timeframe
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {t.value}
              </button>
            ))}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <LayoutGrid className="size-3.5" />
                Layouts
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="etch-label">Saved layouts</DropdownMenuLabel>
              {(layouts.data?.layouts ?? []).map((l) => (
                <DropdownMenuItem
                  key={l.id}
                  onSelect={() => {
                    setLayout(l.panels);
                    setActiveName(l.name);
                    setMaximized(null);
                  }}
                >
                  {l.name}
                </DropdownMenuItem>
              ))}
              {available.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="etch-label">Add panel</DropdownMenuLabel>
                  {available.map((p) => (
                    <DropdownMenuItem key={p} onSelect={() => setLayout((l) => addPanel(l, p))}>
                      <Plus className="size-3.5" />
                      {PANEL_META[p].title}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-1.5">
            <Input
              value={activeName}
              onChange={(e) => setActiveName(e.target.value)}
              aria-label="Layout name"
              className="h-8 w-32 font-mono text-xs"
            />
            <Button
              size="sm"
              onClick={() => save.mutate({ name: activeName.trim() || "Untitled", panels: layout, isDefault: true })}
              disabled={save.isPending}
            >
              <Save className="size-3.5" />
              Save
            </Button>
          </div>
        </div>
      </div>

      {layouts.isLoading ? (
        <Skeleton className="h-[70vh] w-full" />
      ) : maximized ? (
        <div className="h-[calc(100vh-11rem)]">
          <PanelFrame
            title={PANEL_META[maximized].title}
            kicker={PANEL_META[maximized].kicker}
            accent={maximized === "ai" ? "ai" : maximized === "signal" ? "brand" : "default"}
            maximized
            onToggleMaximize={() => setMaximized(null)}
          >
            <PanelBody id={maximized} ctx={ctx} />
          </PanelFrame>
        </div>
      ) : (
        <Group orientation="horizontal" className="h-[calc(100vh-11rem)] min-h-[520px] gap-1.5">
          {layout.columns.map((col, ci) => (
            <Fragment key={col.id}>
              {ci > 0 && (
                <Separator className="w-1.5 rounded-full bg-border/60 transition-colors hover:bg-primary/50" />
              )}
              <Panel defaultSize={`${100 / layout.columns.length}%`} minSize="15%">
                <Group orientation="vertical" className="h-full gap-1.5">
                  {col.panels.map((p, pi) => (
                    <Fragment key={p}>
                      {pi > 0 && (
                        <Separator className="h-1.5 rounded-full bg-border/60 transition-colors hover:bg-primary/50" />
                      )}
                      <Panel defaultSize={`${100 / col.panels.length}%`} minSize="12%">
                        <div
                          className="h-full"
                          onDragOver={(e) => {
                            if (dragging) e.preventDefault();
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            drop(col.id, pi);
                          }}
                        >
                          <PanelFrame
                            title={PANEL_META[p].title}
                            kicker={PANEL_META[p].kicker}
                            accent={p === "ai" ? "ai" : p === "signal" ? "brand" : "default"}
                            onToggleMaximize={() => setMaximized(p)}
                            onClose={() => setLayout((l) => removePanel(l, p))}
                            onDragStart={() => setDragging(p)}
                          >
                            <PanelBody id={p} ctx={ctx} />
                          </PanelFrame>
                        </div>
                      </Panel>
                    </Fragment>
                  ))}
                </Group>
              </Panel>
            </Fragment>
          ))}
        </Group>
      )}
    </AppShell>
  );
}