import mark from "@/assets/aethron-mark.png";
import { cn } from "@/lib/utils";

/** AETHRON mark — the gradient A used in the sidebar, auth screens and landing. */
export function AethronMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-md p-1",
        className,
      )}
      style={{ backgroundImage: "var(--gradient-brand)" }}
    >
      <img
        src={mark}
        alt=""
        aria-hidden
        loading="lazy"
        width={1024}
        height={1024}
        className="size-full object-contain brightness-0 invert"
      />
    </span>
  );
}

export function AethronWordmark({
  className,
  tagline,
}: {
  className?: string;
  tagline?: string;
}) {
  return (
    <span className={cn("min-w-0", className)}>
      <span className="block truncate font-display text-sm font-bold uppercase tracking-[0.32em] text-gradient-brand">
        Aethron
      </span>
      {tagline && (
        <span className="block truncate font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {tagline}
        </span>
      )}
    </span>
  );
}