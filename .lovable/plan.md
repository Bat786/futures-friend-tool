# "Panel" instrument-panel redesign + backend gap closure

Your `dashboard.html` is the design target: a brass-and-graphite instrument panel, not a generic chart-in-a-box. The current app is on the Neon Mint theme, so this is a full visual re-skin plus the terminal layout, done alongside the four backend items you picked.

## 1. Design system swap

Replace the current tokens in `src/styles.css` with the Panel palette:

```text
bg #0B0D0F   panel #14171A   raised #191D21
line #262B30 / #34393F       text #E7E4DD / #8A8F94 / #565B60
brass #C08A3E (accent)       bull #4A9B6E   bear #B5504A
```

Typography: JetBrains Mono for every number, label and tag; Inter for prose. Square 3px corners, 1px hairline borders, no glows, no gradients. Sidebar navigation stays but is restyled as a hardware rail; the header becomes the brand mark + session clock in Central time.

## 2. The analog gauge

Rebuild `signal-gauge.tsx` as a real dial: a 180-degree arc with minor tick marks every 10 points and major ticks with BEAR / BULL end labels, a brass needle pivoting from a hub, the score in large mono type underneath, and the direction word in the signal colour.

Below it, four LEDs — RSI, VWAP, MACD, Momentum — each lit green / red / grey straight from `signal.readings`, so the lights and the needle can never disagree. Volume z-score stays a text reading (weight 0, no LED).

## 3. Terminal layout

`/terminal` is rebuilt to the panel arrangement:

- Top strip: gauge panel on the left, watchlist on the right — one cell per symbol with price, change and a brass top-border on the active one, clicking swaps the chart.
- Chart panel: candlesticks with a VWAP overlay line, a separate volume histogram beneath, legend for VWAP and MACD histogram, and a timeframe button row in the footer.
- Bottom grid: trade journal table (symbol, side tag, setup, entry, exit, size, P&L) on the left and an analytics sidebar on the right — net P&L, win rate, expectancy, max drawdown, then P&L-by-setup as horizontal bars.

`/execution`, `/journal`, `/analytics` and `/settings` get the same token pass so the app reads as one instrument.

Watchlist symbols move to the Topstep micro set shown in your mock — MES, MNQ, MYM, M2K, MCL — with the e-minis kept in the instrument list.

## 4. Backend gaps (the four you picked)

- **Signal readings at entry.** `submitOrder` opens the trade row before sending the order, computes the composite signal server-side, writes one `signals` row per indicator, and records the entry fill. New analytics panel: win rate and expectancy grouped by what each indicator read at entry.
- **Contract lookup.** Add contract search to the gateway client and a `resolveContract(symbol)` server function that picks the front-month id, cached per session, replacing the hardcoded `CON.F.US.*.Z25` strings. Falls back to the hardcoded id when credentials are absent.
- **Tunable weights.** Per-user weights for RSI / VWAP / MACD / momentum stored with risk settings, sliders on `/settings` (0-2 in 0.25 steps), applied by the gauge and by `getSignal`.
- **R-multiple.** Capture stop distance at entry from the bracket ticks and tick value; on close set `pnl_r_multiple = pnl / risk_at_entry`. Average-R tile in analytics, R column in the journal.

## 5. Parity tests

Vitest over the pure modules with a synthetic uptrend fixture: RSI, MACD histogram, session VWAP, momentum, volume z-score, the `adjust=False` recursion, RSI reading 50 where undefined, the exact composite formula and ±20 thresholds, and every risk-gate branch including the unattended block.

## Technical notes

- Your FastAPI endpoints map onto existing server functions — `/api/signal` is `getSignal`, `/api/risk/status` is `getRiskState`, `/api/orders` is `submitOrder`, the journal/analytics reads are `listTrades` plus the pure `analytics.ts`. No new HTTP layer; the risk check stays enforced server-side.
- Live refresh stays polling (30s bars, faster gauge) rather than a websocket — same trade-off as your `/ws/signal` loop.
- Migration adds `weight_rsi`, `weight_vwap`, `weight_macd`, `weight_momentum` to risk settings and `risk_at_entry` to trades, with defaults preserving current behaviour.
- All colours stay semantic tokens, so nothing hardcodes hex in components.
