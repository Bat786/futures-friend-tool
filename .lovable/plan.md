# Futures Signal & Execution Terminal — updated plan

The approved plan stands. This revision folds in the journal/analytics/risk Python modules and `schema.sql` you just sent, and records what already exists in the project.

## Already done in this session

- Lovable Cloud enabled; email/password + Google sign-in configured.
- Database created: `profiles`, `broker_accounts`, `risk_settings`, `trades`, `signals`, `fills`, `daily_summary`, `bar_cache`. Every table is private to its owner (`auth.uid()`); a signup trigger creates the profile and default risk settings.
- Dark terminal design system (near-black surfaces, mono numerics, green profit / red loss / amber risk tokens).
- `lightweight-charts` installed; instrument list, timeframes and a deterministic simulated bar feed in place so the chart works before broker credentials exist.

## Schema deltas from your `schema.sql`

One follow-up migration to bring the tables fully in line:

- CHECK constraints: `trades.side` in (buy, sell), `trades.status` in (open, closed, cancelled), `fills.fill_type` in (entry, exit, partial_entry, partial_exit), `signals.direction` in (bullish, bearish, neutral).
- `trades.updated_at` plus a `set_updated_at` trigger; `daily_summary.updated_at`.
- Indexes on `trades(user_id, setup_tag)`, `trades(user_id, status)`, `signals(indicator_name)`.

Two intentional differences: ids stay `uuid` and ownership is `user_id uuid` referencing the auth user, because row-level security keys off the signed-in user rather than a `BIGINT user_id = 1` placeholder.

## Ported modules (Python to TypeScript)

| Your module | Becomes |
|---|---|
| `config.py` / `client.py` | `src/lib/topstepx.server.ts` — base URL + credentials from server env, `loginKey`/`validate` with token caching, `placeOrder` with stop-loss/take-profit brackets, `cancelOrder`, `modifyOrder`, `searchOrders`, `searchPositions`, `closeContract`, `retrieveBars`, retry/backoff on rate limits |
| `enums.py` | `src/lib/broker-enums.ts` — OrderType 1/2/4/5/6/7, OrderSide 0/1, exact spec values |
| `risk.py` | `src/lib/risk.ts` — `RiskLimits`, `DailyState`, `checkPreTrade` returning a human-readable block reason, `recordTradeResult` |
| `journal.py` | `src/lib/journal.functions.ts` — `openTrade`, `closeTrade` (computes net P&L and R multiple from the entry stop distance), `recordFill`, `recordSignal`, `getTrades` |
| `get_daily_state()` | `getDailyState` server function — rebuilds today's realized P&L, trade count and loss streak from closed trades, so limits survive a reload. Runs on every page load of the execution screen, not just at session start |
| `analytics.py` | `src/lib/analytics.ts` — `winRate`, `avgWinLoss`, `expectancy`, `pnlBySetup`, `pnlByHourOfDay`, `equityCurve`, `maxDrawdown`, `summary` |

Two gaps from your README get closed here: `pnl_r_multiple` is computed on close from the stop captured at entry, and `user_id` comes from the authenticated session instead of a hardcoded 1.

## Screens

- `/` — public landing: what the terminal does, and the supervision rules (attended only, no VPS, no HFT).
- `/auth` — sign in / sign up, email + Google.
- `/terminal` — candlestick chart with VWAP/EMA overlays, indicator panel (RSI, VWAP, MACD, momentum, volume), and the composite gauge/needle.
- `/journal` — trade list, manual open/close, fills and entry signals per trade, setup tags and notes.
- `/analytics` — summary header (trade count, win rate, expectancy, net P&L, max drawdown), equity curve, P&L by setup, P&L by hour of day, live vs backtest toggle.
- `/execution` — account/positions panel, order ticket with bracket ticks, live pre-trade risk readout (today's P&L vs limit, trades used, loss streak), and the flatten-all kill switch. Orders are never auto-fired: each send is an explicit click, and an idle detector disarms trading when the tab is unattended.
- `/settings` — risk limits and broker account setup.

## Order of work

1. Follow-up schema migration (constraints, triggers, indexes).
2. Indicators, composite signal, gauge, chart — `/terminal`.
3. Journal + analytics — `/journal`, `/analytics`.
4. TopstepX client, risk gate, order ticket, kill switch — `/execution`, demo gateway by default.
5. Backtesting and the news layer afterwards, as in the original plan.

## Credentials

`TOPSTEPX_USERNAME` and `TOPSTEPX_API_KEY` are requested as secrets when the execution layer lands, read only inside server handlers. `TOPSTEPX_BASE_URL` defaults to the demo gateway (`gateway-api-demo.s2f.projectx.com/api`); switching to live is a deliberate setting change.
