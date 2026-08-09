# Closing the `example_full.py` gaps

Your indicators, signal engine and bridge are already ported and matching (`src/lib/indicators.ts`, `src/lib/signal.ts`, `getSignal` in `src/lib/broker.functions.ts`). What's left is the surrounding layer that `example_full.py` demonstrates.

## 1. Log signal readings at entry

Today `submitOrder` runs the risk gate and places the order, but nothing is written to the journal. Mirror the Python order of operations:

- Open the trade row **before** sending the order, so a crash or rejection still leaves a record (status `open`, then marked `rejected` if the broker refuses).
- Compute the composite signal server-side at that moment and write one `signals` row per indicator (`indicator_name`, `value_at_entry`, `direction`, `timeframe`) — the analogue of `journal.record_signal()`.
- Record the entry `fill` row with the returned order id.
- Return the trade id to the ticket so the execution page can show what was logged.

This makes the later question answerable: which readings preceded winners. A new analytics panel will group closed trades by the direction each indicator held at entry, with win rate and expectancy per indicator.

## 2. Contract lookup

`INSTRUMENTS` hardcodes `CON.F.US.EP.Z25` and friends, which expire. Add a contract search call to the gateway client and a `resolveContract(symbol)` server function that picks the front-month contract for ES/NQ/CL/GC/YM, cached in memory for the session. Bars and orders use the resolved id; the hardcoded id stays as fallback when credentials are absent.

## 3. User-tunable indicator weights

Weights already exist as a parameter in `computeSignal`. Expose them:

- Four numeric weights (RSI, VWAP, MACD, momentum) stored per user alongside the existing risk settings.
- Sliders on `/settings`, 0 to 2 in 0.25 steps, with a live preview of the resulting score.
- Terminal and `getSignal` read the user's weights, so the gauge reflects their own model. Volume z-score stays informational at weight 0.

## 4. R-multiple

`pnl_r_multiple` exists but is never computed. Capture the stop distance at entry (from the bracket ticks and the instrument tick value) and, on close, set `pnl_r_multiple = pnl / risk_at_entry`. Analytics gains an average-R tile and R shows in the journal table.

## 5. Parity tests

Add Vitest with a synthetic uptrend fixture matching your test data and assert:

- RSI, MACD histogram, session VWAP, momentum and volume z-score values.
- `ewm` recursion matches `adjust=False` seeding, and RSI reads 50 where undefined.
- The composite score is exactly `(weighted_sum / total_weight) * 100` rounded to one decimal, with the ±20 direction thresholds.
- Risk gate: daily loss limit, trade count, consecutive losses, position size, unattended block.

## Technical notes

- Database: add `weight_rsi`, `weight_vwap`, `weight_macd`, `weight_momentum` and `risk_at_entry` columns (defaults preserve current behaviour), with grants unchanged since RLS already scopes both tables to the owner.
- Signal capture happens inside the authenticated server function, never from the browser, so the logged readings can't be forged.
- Contract resolution failures degrade to the current hardcoded id rather than blocking the ticket.
- Vitest runs against the pure modules only — no network, no database.
