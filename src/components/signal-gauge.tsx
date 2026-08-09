import type { CompositeSignal, SignalDirection } from "@/lib/signal";
import { cn } from "@/lib/utils";

const COLOR: Record<SignalDirection, string> = {
  bullish: "var(--profit)",
  bearish: "var(--loss)",
  neutral: "var(--muted-foreground)",
};

const CX = 130;
const CY = 128;
const R = 104;

function polar(angleDeg: number, radius: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
}

/** score -100..100 -> -90deg..+90deg on the dial */
function scoreToAngle(score: number) {
  return (Math.max(-100, Math.min(100, score)) / 100) * 90;
}

/**
 * Analog instrument dial: engraved arc, minor/major ticks, brass needle and a
 * row of indicator LEDs beneath — one per voting indicator.
 */
export function SignalGauge({ signal }: { signal: CompositeSignal }) {
  const angle = scoreToAngle(signal.score);
  const color = COLOR[signal.direction];
  const needle = polar(angle, R * 0.82);
  const tail = polar(angle + 180, R * 0.14);

  const ticks = Array.from({ length: 21 }, (_, i) => {
    const value = -100 + i * 10;
    const major = value % 50 === 0;
    const a = scoreToAngle(value);
    const outer = polar(a, R);
    const inner = polar(a, R - (major ? 16 : 9));
    return { value, major, outer, inner, label: polar(a, R - 28) };
  });

  const arcStart = polar(-90, R);
  const arcEnd = polar(90, R);
  const leds = signal.readings.filter((r) => r.weight > 0);

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox="0 0 260 152"
        className="w-full max-w-[300px]"
        role="img"
        aria-label={`Composite signal ${signal.label}, score ${signal.score}`}
      >
        <defs>
          <linearGradient id="brassNeedle" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--brass-dim)" />
            <stop offset="55%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--highlight)" />
          </linearGradient>
          <radialGradient id="hubMetal" cx="35%" cy="30%">
            <stop offset="0%" stopColor="var(--highlight)" />
            <stop offset="70%" stopColor="var(--brass-dim)" />
            <stop offset="100%" stopColor="var(--etch)" />
          </radialGradient>
        </defs>

        {/* dial face */}
        <path
          d={`M ${arcStart.x} ${arcStart.y} A ${R} ${R} 0 0 1 ${arcEnd.x} ${arcEnd.y}`}
          fill="none"
          stroke="var(--etch)"
          strokeWidth="1.25"
        />
        <path
          d={`M ${polar(-90, R - 30).x} ${polar(-90, R - 30).y} A ${R - 30} ${R - 30} 0 0 1 ${polar(90, R - 30).x} ${polar(90, R - 30).y}`}
          fill="none"
          stroke="var(--grid)"
          strokeWidth="1"
        />

        {/* zone bands */}
        <path
          d={`M ${polar(-90, R - 7).x} ${polar(-90, R - 7).y} A ${R - 7} ${R - 7} 0 0 1 ${polar(-18, R - 7).x} ${polar(-18, R - 7).y}`}
          fill="none"
          stroke="var(--loss)"
          strokeWidth="3"
          opacity="0.55"
        />
        <path
          d={`M ${polar(18, R - 7).x} ${polar(18, R - 7).y} A ${R - 7} ${R - 7} 0 0 1 ${polar(90, R - 7).x} ${polar(90, R - 7).y}`}
          fill="none"
          stroke="var(--profit)"
          strokeWidth="3"
          opacity="0.55"
        />

        {ticks.map((t) => (
          <g key={t.value}>
            <line
              x1={t.inner.x}
              y1={t.inner.y}
              x2={t.outer.x}
              y2={t.outer.y}
              stroke={t.major ? "var(--primary)" : "var(--etch)"}
              strokeWidth={t.major ? 2 : 1}
              strokeLinecap="round"
            />
            {t.major && (
              <text
                x={t.label.x}
                y={t.label.y + 3}
                textAnchor="middle"
                fill="var(--muted-foreground)"
                fontSize="8"
                fontFamily="var(--font-mono)"
              >
                {t.value > 0 ? `+${t.value}` : t.value}
              </text>
            )}
          </g>
        ))}

        {/* needle */}
        <g style={{ transition: "all 500ms cubic-bezier(0.22, 1, 0.36, 1)" }}>
          <line
            x1={tail.x}
            y1={tail.y}
            x2={needle.x}
            y2={needle.y}
            stroke="url(#brassNeedle)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <circle cx={needle.x} cy={needle.y} r="3" fill={color} />
        </g>
        <circle cx={CX} cy={CY} r="9" fill="url(#hubMetal)" stroke="oklch(0 0 0 / 0.6)" strokeWidth="1" />
        <circle cx={CX} cy={CY} r="3" fill="oklch(0 0 0 / 0.7)" />
      </svg>

      <div className="-mt-2 text-center">
        <div className="tabular text-4xl font-semibold leading-none" style={{ color }}>
          {signal.score > 0 ? "+" : ""}
          {signal.score}
        </div>
        <div
          className="mt-2 inline-block rounded-sm border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.22em]"
          style={{ color, borderColor: color, backgroundColor: `color-mix(in oklab, ${color} 12%, transparent)` }}
        >
          {signal.label}
        </div>
      </div>

      {/* indicator LEDs */}
      <div className="mt-4 grid w-full max-w-[300px] grid-cols-4 gap-2 border-t border-border pt-3">
        {leds.map((r) => (
          <div key={r.name} className="flex flex-col items-center gap-1.5">
            <span
              className={cn("size-2.5 rounded-full ring-1 ring-inset ring-black/50")}
              style={{
                backgroundColor: COLOR[r.direction],
                boxShadow:
                  r.direction === "neutral"
                    ? "none"
                    : `0 0 8px 0 color-mix(in oklab, ${COLOR[r.direction]} 70%, transparent)`,
              }}
              aria-hidden
            />
            <span className="etch-label text-center leading-tight">{r.name}</span>
            <span className="tabular text-[10px] text-muted-foreground">{r.display}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
