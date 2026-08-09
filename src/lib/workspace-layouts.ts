/**
 * Workspace layout model. A layout is a row of columns; each column stacks
 * panels top to bottom. Sizes are percentages handled by react-resizable-panels.
 */

export const PANEL_IDS = [
  "chart",
  "signal",
  "positions",
  "risk",
  "scanner",
  "news",
  "ai",
  "journal",
] as const;

export type PanelId = (typeof PANEL_IDS)[number];

export type WorkspaceColumn = {
  id: string;
  panels: PanelId[];
};

export type WorkspaceLayout = {
  columns: WorkspaceColumn[];
};

export type SavedLayout = {
  id: string;
  name: string;
  panels: WorkspaceLayout;
  is_default: boolean;
  updated_at: string;
};

export const PANEL_META: Record<PanelId, { title: string; kicker: string }> = {
  chart: { title: "Chart", kicker: "Price action" },
  signal: { title: "AETHRON Signals", kicker: "Composite score" },
  positions: { title: "AETHRON Flow", kicker: "Open exposure" },
  risk: { title: "AETHRON Risk", kicker: "Prop-firm guardrails" },
  scanner: { title: "AETHRON Scanner", kicker: "Unusual activity" },
  news: { title: "News", kicker: "Impact and calendar" },
  ai: { title: "AETHRON AI", kicker: "Market intelligence" },
  journal: { title: "Journal", kicker: "Recent trades" },
};

export const DEFAULT_LAYOUT: WorkspaceLayout = {
  columns: [
    { id: "left", panels: ["chart", "journal"] },
    { id: "center", panels: ["signal", "positions"] },
    { id: "right", panels: ["risk", "news"] },
  ],
};

/** Starter presets offered the first time a trader opens the workspace. */
export const LAYOUT_PRESETS: { name: string; panels: WorkspaceLayout }[] = [
  { name: "Default", panels: DEFAULT_LAYOUT },
  {
    name: "NQ Scalping",
    panels: {
      columns: [
        { id: "left", panels: ["chart"] },
        { id: "right", panels: ["signal", "risk", "positions"] },
      ],
    },
  },
  {
    name: "News Trading",
    panels: {
      columns: [
        { id: "left", panels: ["news", "scanner"] },
        { id: "right", panels: ["chart", "ai"] },
      ],
    },
  },
  {
    name: "Prop Firm Risk",
    panels: {
      columns: [
        { id: "left", panels: ["risk", "positions"] },
        { id: "right", panels: ["journal", "signal"] },
      ],
    },
  },
];

export function isPanelId(value: string): value is PanelId {
  return (PANEL_IDS as readonly string[]).includes(value);
}

/** Coerce arbitrary JSON from the database into a usable layout. */
export function normalizeLayout(value: unknown): WorkspaceLayout {
  const raw = value as Partial<WorkspaceLayout> | null | undefined;
  const columns = Array.isArray(raw?.columns) ? raw.columns : [];
  const cleaned = columns
    .map((c, i) => ({
      id: typeof c?.id === "string" && c.id ? c.id : `col-${i}`,
      panels: Array.isArray(c?.panels) ? c.panels.filter((p): p is PanelId => typeof p === "string" && isPanelId(p)) : [],
    }))
    .filter((c) => c.panels.length > 0);
  return cleaned.length ? { columns: cleaned } : DEFAULT_LAYOUT;
}

export function movePanel(
  layout: WorkspaceLayout,
  panel: PanelId,
  toColumnId: string,
  toIndex: number,
): WorkspaceLayout {
  const stripped = layout.columns.map((c) => ({ ...c, panels: c.panels.filter((p) => p !== panel) }));
  const target = stripped.find((c) => c.id === toColumnId);
  if (!target) return layout;
  const index = Math.max(0, Math.min(toIndex, target.panels.length));
  target.panels = [...target.panels.slice(0, index), panel, ...target.panels.slice(index)];
  const columns = stripped.filter((c) => c.panels.length > 0);
  return { columns: columns.length ? columns : DEFAULT_LAYOUT.columns };
}

export function removePanel(layout: WorkspaceLayout, panel: PanelId): WorkspaceLayout {
  const columns = layout.columns
    .map((c) => ({ ...c, panels: c.panels.filter((p) => p !== panel) }))
    .filter((c) => c.panels.length > 0);
  return { columns: columns.length ? columns : DEFAULT_LAYOUT.columns };
}

export function addPanel(layout: WorkspaceLayout, panel: PanelId): WorkspaceLayout {
  if (layout.columns.some((c) => c.panels.includes(panel))) return layout;
  const columns = layout.columns.map((c) => ({ ...c, panels: [...c.panels] }));
  const smallest = columns.reduce((a, b) => (b.panels.length < a.panels.length ? b : a), columns[0]!);
  smallest.panels.push(panel);
  return { columns };
}