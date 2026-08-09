# Signal engine alignment + terminal UI

Your `indicators.py` / `signal_engine.py` / `bridge.py` are the reference. The TypeScript versions already in the project were written before I saw them and differ in two ways that matter, so step 1 is making them match your semantics exactly. Then the UI that renders them.

## 1. Match the reference indicator math

`src/lib/indicators.ts` currently uses hand-written Wilder smoothing and a simple-average relative volume. Bring it in line with the Python:

- RSI: use the same `ewm(alpha=1/period, adjust=False)` recursion, and return 50 (neutral) where undefined instead of null, matching your `.fillna(50)`.
- MACD: your version seeds EMAs from the first bar with `adjust=False` and emits values from bar 0; mine suppresses output until `period` bars. Switch to your behaviour so the histogram matches value-for-value.
- Volume z-score: replace my `relativeVolume` (ratio to a 20-bar mean) with `volume_zscore` (rolling mean and standard deviation), since that is what your engine exposes.
- VWAP and momentum already match: session reset on calendar day, and pct change over `period` bars as a percentage.

## 2. Rewrite the composite score as a weighted vote

My current `src/lib/signal.ts` maps each indicator onto a continuous -100..100 score and scales the result by relative volume. That is not what your engine does. Replace it with your model exactly:

- Each indicator is classified to bullish / neutral / bearish by the same thresholds: RSI >= 60 or <= 40, price vs VWAP, MACD histogram sign, momentum against a 0.05 threshold.
- Direction score of +1 / 0 / -1, multiplied by a per-indicator weight.
- `score = (weighted_sum / total_weight) * 100`, rounded to one decimal.
- Composite direction: bullish at >= 20, bearish at <= -20, otherwise neutral.
- Weights default to 1.0 each and stay a parameter, so per-user weighting can be added later without touching the engine.

Volume z-score is kept as a displayed reading with weight 0 (informational, no vote) unless you want it voting - say the word and I will give it a threshold and a weight.

## 3. Bridge equivalent

`bridge.py`'s job is already covered by `getBars` in `src/lib/broker.functions.ts`: it fetches from the gateway, maps `t/o/h/l/c/v` onto our bar shape in one place, and falls back to simulated bars when credentials are absent. I will add a `getSignal` server function next to it that fetches bars and returns the composite signal, so the gauge has a single call - the direct analogue of `fetch_signal()`.

## 4. Terminal UI (the missing pages)

The app currently has no routes beyond the placeholder index, which is why the nav links do not resolve yet. To build:

- `/auth` - email/password plus Google sign-in.
- `/` - replace the placeholder with a short landing page that sends signed-in users to the terminal.
- `/terminal` - instrument and timeframe selector, candlestick chart with VWAP overlay, the gauge driven by the composite score, and a readings table showing each indicator's value, direction and weight so the reason behind the needle is visible.
- `/execution` - account picker, order ticket with bracket ticks, the risk gate verdict shown before the button is enabled, an attended-session heartbeat, and a flatten-all kill switch.
- `/journal` - trade list with manual entry and edit, setup tags and notes.
- `/analytics` - summary tiles, equity curve, P&L by setup and by hour of day.
- `/settings` - risk limits and arm/disarm for the kill switch.

## Technical notes

- Indicators, signal engine, risk rules and analytics stay pure functions with no I/O, so they run unchanged in the browser, in server functions, and later in a backtest loop.
- Same caveat as your note about recomputing the whole window per bar: these are full-window recomputes, fine for polling every few seconds. If tick-level latency ever matters, incremental versions slot in behind the same signatures.
- Chart rendering is client-only (lightweight-charts touches the DOM) and loads after hydration.
- Broker credentials (`TOPSTEPX_USERNAME`, `TOPSTEPX_API_KEY`, `TOPSTEPX_BASE_URL`) are read server-side only and default to the demo gateway. Until they are set, the terminal runs on deterministic simulated bars so the whole signal path is testable.
- Execution stays supervised: the risk gate is enforced server-side as well as in the UI, and an unattended tab blocks order submission rather than trading unattended.