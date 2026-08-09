import { GripVertical, Maximize2, Minimize2, X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Chrome shared by every workspace panel: title bar, drag handle, controls. */
export function PanelFrame({
  title,
  kicker,
  accent = "default",
  maximized,
  onToggleMaximize,
  onClose,
  onDragStart,
  children,
  actions,
}: {
  title: string;
  kicker?: string;
  accent?: "default" | "brand" | "ai";
  maximized?: boolean;
  onToggleMaximize?: () => void;
  onClose?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden",
        accent === "brand" ? "panel-glow" : accent === "ai" ? "panel-ai" : "panel",
      )}
    >
      <header
        draggable={Boolean(onDragStart)}
        onDragStart={onDragStart}
        className="grid shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-border/70 px-2 py-1.5"
      >
        <span className="grid size-6 shrink-0 cursor-grab place-items-center text-muted-foreground active:cursor-grabbing">
          <GripVertical className="size-3.5" />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-display text-xs font-semibold tracking-tight">{title}</span>
          {kicker && <span className="etch-label block truncate">{kicker}</span>}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {actions}
          {onToggleMaximize && (
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={onToggleMaximize}
              aria-label={maximized ? `Restore ${title}` : `Maximize ${title}`}
            >
              {maximized ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
            </Button>
          )}
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={onClose}
              aria-label={`Close ${title}`}
            >
              <X className="size-3.5" />
            </Button>
          )}
        </span>
      </header>
      <div className="min-h-0 flex-1 overflow-auto p-3">{children}</div>
    </section>
  );
}