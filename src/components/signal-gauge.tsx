import type { CompositeSignal } from "@/lib/signal";

const COLOR: Record<string, string> = {
  bullish: "var(--profit)",
  bearish: "var(--loss)",
  neutral: "var(--muted-foreground)",
};

export function SignalGauge({ signal }: { signal: CompositeSignal }) {
  // -100..100 mapped onto a 180-degree arc.
  const angle = ((signal.score + 100) / 200) * 180 - 90;
  const radius = 88;
  const cx = 110;
  const cy = 110;
  const needleX = cx + radius * 0.82 * Math.sin((angle * Math.PI) / 180);
  const needleY = cy - radius * 0.82 * Math.cos((angle * Math.PI) / 180);
  const color = COLOR[signal.direction]!;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 220 130" className="w-full max-w-[260px]" role="img" aria-label={`Composite signal ${signal.label}`}>
        <defs>
          <linearGradient id="gaugeArc" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--loss)" />
            <stop offset="50%" stopColor="var(--muted-foreground)" />
            <stop offset="100%" stopColor="var(--profit)" />
          </linearGradient>
        </defs>
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="url(#gaugeArc)"
          strokeWidth="14"
          strokeLinecap="round"
          opacity="0.85"
        />
        <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke={color} strokeWidth="3" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="5" fill={color} />
      </svg>
      <div className="-mt-4 text-center">
        <div className="font-mono text-3xl font-bold" style={{ color }}>
          {signal.score > 0 ? "+" : ""}
          {signal.score}
        </div>
        <div className="text-sm font-medium" style={{ color }}>
          {signal.label}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          Composite of {signal.readings.filter((r) => r.weight > 0).length} weighted indicators
        </div>
      </div>
    </div>
  );
}