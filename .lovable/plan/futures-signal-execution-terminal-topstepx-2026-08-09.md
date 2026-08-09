# Futures Signal & Execution Terminal (TopstepX)

A supervised, browser-based trading terminal: live chart + indicator signals, a trade journal with analytics, and a broker-agnostic execution bridge whose first adapter is TopstepX/ProjectX. Execution stays attended — the app runs in the user's session, with a kill switch and hard client-side risk guardrails before any order leaves.

Note on the pasted Python modules (config/enums/client/risk/example): this project is a TanStack Start + React app, so that logic gets ported to TypeScript server functions rather than shipped as a Python service. Same structure, same enums, same guardrails.

## Phase 1 — Foundation, data, and signals

- Enable Lovable Cloud (accounts + Postgres) with email/password and Google sign-in.
- Dark, terminal-style design system: near-black surfaces, mono numerics, green/red P&L tokens, amber for risk warnings. No default AI-purple.
- TopstepX credentials stored as project secrets (`TOPSTEPX_USERNAME`, `TOPSTEPX_API_KEY`, `TOPSTEPX_BASE_URL`), never in the browser. Default base URL points at the demo gateway.
- Server functions: `loginKey` + `validate` with token caching/refresh, `Account/search`, `History/retrieveBars` (cached in Postgres to respect the separate rate limit).
- Chart page using `lightweight-charts`: candles, VWAP/EMA overlays, buy/sell markers.
- Indicator engine in TypeScript (RSI, VWAP, MACD, momentum, volume) computing a composite -100..+100 score.
- SVG gauge/needle driven by the composite score, plus a signal panel showing each indicator's contribution.

## Phase 2 — Trade journal & analytics

Tables (all RLS-scoped to `auth.uid()`, with an `is_backtest` flag so backtests reuse the same dashboards):

- `trades` — account_id, contract_id, symbol, side, entry/exit price, size, times, fees, pnl, pnl_r_multiple, status, order_ids, stop/target, setup_tag, notes
- `signals` — trade_id, indicator_name, value_at_entry, direction, timeframe
- `fills` — trade_id, order_id, price, size, timestamp, fill_type
- `daily_summary` — date, trades/win/loss counts, gross/net pnl, max intraday drawdown, avg R

Analytics dashboard: win rate, average R:R, equity/drawdown curve, P&L by setup, instrument, and time-of-day. Manual trade entry first, then auto-import from `Order/search`.

## Phase 3 — Execution bridge (supervised)

- Broker adapter interface (`placeOrder`, `cancel`, `modify`, `positions`, `flatten`) so Tradovate/Rithmic can be added later; TopstepX is the first implementation.
- Order ticket: type (1 Limit / 2 Market / 4 Stop / 5 Trailing), side (0 Buy / 1 Sell), size, with `stopLossBracket`/`takeProfitBracket` in ticks attached at entry.
- Pre-trade risk gate — evaluated before every send, blocking with a plain-language reason: daily loss limit, max trades/day, consecutive-loss limit, max position size, manual kill switch armed.
- Kill switch: one button → `Position/closeContract` on every open position + cancel all working orders.
- Supervision enforcement: signals never auto-fire. Every order requires an explicit click, and a heartbeat/idle detector disarms trading when the tab is unattended. An in-app compliance notice states no VPS, no unattended execution, no HFT.
- Live state via SignalR hubs (`/hubs/user`, `/hubs/market`) for orders, positions, account, and quotes, with polling fallback.

## Phase 4 — Backtesting

Replay stored bars through the same indicator/signal code, simulate fills with configurable slippage and commissions, and write results into the same tables with `is_backtest = true` so live vs. backtest sit side by side.

## Phase 5 — News & multi-broker

Economic calendar feed filtered to futures-relevant releases (CPI, NFP, FOMC) shown as badges on affected instruments, plus a second broker adapter.

## Technical notes

- All TopstepX calls run in `createServerFn` handlers; secrets are read inside handlers only. Retry with backoff on 429.
- Order placement is a POST server function with the risk gate evaluated server-side as well as in the UI.
- Realtime SignalR runs client-side behind `<ClientOnly>`; `lightweight-charts` is lazy-imported so SSR never touches the DOM.
- Protected pages live under `_authenticated/`; the public landing page explains the product and the supervision rules.

## What I'd build first

Phase 1 end to end: auth, secrets, account fetch, cached bars, chart, indicators, gauge — no orders, no money at risk. Then Phase 2. Execution only after both are proven against the demo gateway.
