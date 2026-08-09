import { useEffect, useRef } from "react";
import type { Bar } from "@/lib/market";

type Props = { bars: Bar[]; vwapSeries: (number | null)[]; precision: number };

/** Client-only: lightweight-charts touches the DOM at import/creation time. */
export default function PriceChart({ bars, vwapSeries, precision }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<{
    chart: import("lightweight-charts").IChartApi;
    candles: import("lightweight-charts").ISeriesApi<"Candlestick">;
    vwap: import("lightweight-charts").ISeriesApi<"Line">;
  } | null>(null);

  useEffect(() => {
    let disposed = false;
    const el = containerRef.current;
    if (!el) return;

    (async () => {
      const { createChart, CandlestickSeries, LineSeries, ColorType } = await import("lightweight-charts");
      if (disposed || !containerRef.current) return;

      const chart = createChart(containerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: "rgba(148,163,184,0.9)",
          fontFamily: "ui-monospace, SFMono-Regular, monospace",
        },
        grid: {
          vertLines: { color: "rgba(148,163,184,0.08)" },
          horzLines: { color: "rgba(148,163,184,0.08)" },
        },
        rightPriceScale: { borderColor: "rgba(148,163,184,0.15)" },
        timeScale: { borderColor: "rgba(148,163,184,0.15)", timeVisible: true, secondsVisible: false },
        crosshair: { mode: 0 },
        height: 420,
        autoSize: true,
      });

      const candles = chart.addSeries(CandlestickSeries, {
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderUpColor: "#22c55e",
        borderDownColor: "#ef4444",
        wickUpColor: "#22c55e",
        wickDownColor: "#ef4444",
        priceFormat: { type: "price", precision, minMove: 1 / 10 ** precision },
      });
      const vwap = chart.addSeries(LineSeries, {
        color: "#eab308",
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });

      apiRef.current = { chart, candles, vwap };
      chart.timeScale().fitContent();
    })();

    return () => {
      disposed = true;
      apiRef.current?.chart.remove();
      apiRef.current = null;
    };
  }, [precision]);

  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    api.candles.setData(
      bars.map((b) => ({
        time: b.time as never,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
      })),
    );
    api.vwap.setData(
      bars
        .map((b, i) => ({ time: b.time as never, value: vwapSeries[i] }))
        .filter((p): p is { time: never; value: number } => typeof p.value === "number"),
    );
    api.chart.timeScale().fitContent();
  }, [bars, vwapSeries]);

  return <div ref={containerRef} className="h-[420px] w-full" />;
}