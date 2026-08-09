# Topstep Bridge

On Topstep/TopstepX specifically

Topstep is one of the more automation-friendly prop firms — they offer the TopstepX API (built on ProjectX) for order routing and account access. But there are hard rules to know before building this:



	•	Automation must be actively supervised — fully unattended, “set and forget” bots are against their terms.

	•	No VPS/cloud servers running your bot 24/7 — execution needs to be local/attended.

	•	No high-frequency trading or latency arbitrage strategies.

	•	No native TradingView integration — you’d need your own bridge/webhook service to translate signals into API orders.

	•	API orders are final and Topstep doesn’t provide coding support — you’re building and testing against the live path yourself.



Other prop firms (Take Profit Trader, My Funded Futures) are looser on VPS/automation, while Apex Trader Funding is much stricter (semi-auto only, no fully autonomous bots). So “integrate with other propfirm platforms” means building a broker-agnostic architecture, not assuming one rule set fits all.



What’s feasible to build, piece by piece

Here’s the full picture, broken into layers.



1. Market data & signal layer



	•	Feed source: TopstepX/ProjectX API for account-linked data, or a vendor (e.g., Databento, Polygon, IQFeed) for broader futures coverage.

	•	Indicator engine: compute RSI, VWAP, MACD, volume profile, momentum on incoming bars — a Python service (pandas/ta-lib) or a streaming engine if you want low latency.

	•	Signal generator: turns indicator states into bullish/bearish/neutral scores → feeds the “gauge/needle” UI and alerting.



2. Charting & UI layer



	•	Use TradingView’s free lightweight-charts library (not the full paid widget) as your chart base — supports overlays, custom indicators, buy/sell markers.

	•	Gauge component: simple custom widget (SVG/D3 or a chart lib) driven by the signal generator’s composite score.

	•	Alerts: push via websocket to the app UI, plus optional email/SMS/push notification service.



3. Execution / bridge layer



	•	A webhook/bridge service that sits between your signal engine and each broker’s API (TopstepX API, Tradovate, Rithmic, etc.) — this is the piece that has to be broker-agnostic since each prop firm has different rails and rules.

	•	Order manager: translates a signal + user’s configured rules (position size, stop, target, max trades/day, max daily loss) into actual orders.

	•	Critical: build in the supervision requirement Topstep mandates — no fully unattended execution, no VPS. So this needs to run on the user’s own machine or a session they actively monitor, with a kill switch and reconnect/flatten controls.

	•	Risk guardrail layer: hard-coded daily loss limit, drawdown limit, and consistency rules per firm, checked before any order is sent — this is what tools like AlgoProven/Botfolio specialize in, and it’s worth studying their approach.



4. Trade journal & analytics layer



	•	Every fill (from API webhooks/order callbacks) gets logged: symbol, entry/exit price, time, size, fees, P&L, and which signal/setup triggered it.

	•	Analytics on top: win rate, average R:R, P&L by time-of-day/setup/instrument, drawdown curve, streaks.

	•	This is a pretty standard CRUD + reporting app — Postgres for storage, a dashboard (charts) for the analytics views.



5. Backtesting layer



	•	Separate engine: replay historical bars through the same indicator/signal logic used live, simulate fills, output the same P&L/analytics format as the journal so users can compare backtest vs. live performance directly.

	•	This is the most engineering-heavy piece to get right (realistic slippage/fill modeling) — often makes sense to scope it after live execution is solid.



6. News layer



	•	Economic calendar feed (e.g., ForexFactory-style calendar API or a paid news API) filtered to futures-relevant releases (CPI, NFP, FOMC, etc.), surfaced as alerts/badges on the relevant instruments.



Sequencing suggestion



	1.	Charting + indicators + gauge (no execution, no real money at risk) — validates the UI and signal logic.

	2.	Trade journal (users can manually log trades) — validates the data model and analytics.

	3.	Bridge/execution layer with strict risk guardrails, starting with one broker (TopstepX) — highest-risk, most compliance-sensitive piece.

	4.	Backtesting engine once live signal logic is stable.

	5.	Multi-broker support + news layer as expansion.

	•	GET /api/Account/search — list accounts, balances, drawdown status



Orders



	•	POST /api/Order/place — place order. Key fields: accountId, contractId, type (1=Limit, 2=Market, 4=Stop, 5=TrailingStop), side (0=Buy, 1=Sell), size, plus optional stopLossBracket/takeProfitBracket ({ticks, type}) so your bot can attach risk management at entry rather than as a separate call

	•	POST /api/Order/cancel, POST /api/Order/modify — manage open orders

	•	GET /api/Order/search — pull order history for the journal



Positions



	•	GET /api/Position/search — open positions

	•	POST /api/Position/closeContract — flatten a position (this is your “kill switch” endpoint)



Market data



	•	POST /api/History/retrieveBars — historical OHLCV (rate-limited separately, so cache aggressively — this feeds your backtester and chart)

	•	SignalR hubs (rtc.topstepx.com/hubs/user and /hubs/market) — real-time order/position/account events and live quotes, this is what drives your live chart and signal engine instead of polling



Practical note: all order placements pass through Topstep’s own rule engine, so a bracket order that would violate drawdown/consistency rules gets rejected there — but you still want your own pre-trade risk check client-side so users get a clear reason, not just an API error.

Trade journal data model



Core tables:

id, user_id, account_id, contract_id, symbol,

side (buy/sell), entry_price, exit_price, size,

entry_time, exit_time, fees, pnl, pnl_r_multiple,

status (open/closed), order_ids (array), custom_tag,

setup_tag (nullable, links to which signal fired),

stop_price, target_price, notes

signals (what triggered/was active at entry, for later analysis)

id, trade_id, indicator_name (RSI/VWAP/MACD/etc),

value_at_entry, direction (bullish/bearish), timeframe

fills (raw execution records, in case a trade has partial fills)

id, trade_id, order_id, price, size, timestamp, fill_type

daily_summary (rollup, computed nightly or on write)

date, user_id, trades_count, win_count, loss_count,

gross_pnl, net_pnl, max_drawdown_intraday, avg_r_multiple

This structure lets you compute the analytics you mentioned — win rate, P&L by setup, performance by time-of-day — with straightforward group-by queries, and it reuses the same schema for backtest results (just add a is_backtest boolean flag) so live and backtested performance are directly comparable in the same dashboards.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e88b1dc8-96a1-4a09-b229-894d1a917778).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
