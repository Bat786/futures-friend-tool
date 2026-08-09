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
          textColor: "rgba(160,158,150,0.9)",
          fontFamily: "ui-monospace, SFMono-Regular, monospace",
        },
        grid: {
          vertLines: { color: "rgba(180,175,165,0.06)" },
          horzLines: { color: "rgba(180,175,165,0.06)" },
        },
        rightPriceScale: { borderColor: "rgba(192,138,62,0.28)" },
        timeScale: { borderColor: "rgba(192,138,62,0.28)", timeVisible: true, secondsVisible: false },
        crosshair: { mode: 0 },
        height: 420,
        autoSize: true,
      });

      const candles = chart.addSeries(CandlestickSeries, {
        upColor: "#4A9B6E",
        downColor: "#B5504A",
        borderUpColor: "#4A9B6E",
        borderDownColor: "#B5504A",
        wickUpColor: "#4A9B6E",
        wickDownColor: "#B5504A",
        priceFormat: { type: "price", precision, minMove: 1 / 10 ** precision },
      });
      const vwap = chart.addSeries(LineSeries, {
        color: "#C08A3E",
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