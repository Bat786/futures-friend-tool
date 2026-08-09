# AETHRA — brand, design system, and modular workspace

Milestone 1 rebrands Signal Desk into AETHRA and rebuilds the shell around a customizable, panel-based trading workspace. Existing terminal, journal, analytics, execution and risk logic is preserved and re-housed — no trading behaviour changes in this phase.

## What you get

**1. AETHRA identity**
- New palette replacing brass/graphite: near-black base, hot pink primary, electric purple secondary, bright yellow accent, with semantic colors kept separate (green bullish, red bearish, amber warning, purple AI, pink brand, grey neutral).
- Logo mark + wordmark, new favicon, updated landing page, auth screens and page titles/meta.
- Naming updated throughout: AETHRA Terminal, Risk, Journal, Lab, Scanner, Pulse, AI, Community.

**2. Design foundations**
- Tokenized foundations in the global stylesheet: color, elevation, borders, radii, motion durations/easings, chart palette. Components never hardcode colors.
- Type pairing: a geometric display face for headings and numerics, a clean sans for body; tabular figures everywhere prices and P&L appear.
- Restyled shadcn primitives (buttons, cards, tabs, tables, badges, dialogs, tooltips, toasts) plus new trading components: market ticker, P&L card, position card, risk gauge, signal badge, sentiment meter, pressure meter, AI insight card.
- Dark-first, desktop-first, responsive down to mobile. Micro-interactions on state change (P&L ticks, signal flips, risk status).

**3. Modular workspace (the differentiator)**
- Dashboard built on resizable, collapsible panels: Chart, Positions, Risk, Scanner, News, AI, Journal.
- Drag to rearrange, drag edges to resize, maximize any panel to full screen, collapse the sidebar.
- Named layout presets you can save, rename, duplicate and delete — e.g. NQ Scalping, ES Trading, News Trading, Prop Firm Risk. Layouts persist per user and load on sign-in, with a default seeded layout.
- Command palette (Cmd/Ctrl-K) for navigation, symbol switching and layout switching; keyboard shortcuts for full-screen chart and panel focus.

**4. Data wiring in this phase**
- Live panels keep the existing device-origin TopstepX connection — your API key still never touches the server.
- News + economic calendar panel is built against a provider adapter and renders impact tiers (high / important / moderate / low) with affected-instrument tags. It stays in a clearly labelled empty state until you supply a provider API key, which I'll request as the next step.
- Panels needing data you haven't connected show honest empty states rather than fake numbers.

**5. Brand check**
Availability research for AETHRA (existing companies, trademark signals, domains, handles) is running; I'll report the verdict alongside this plan.

## Not in this milestone
Risk engine intelligence, AI agent, scanner logic, backtesting lab, community and gamification, subscriptions. Their panels and routes are created as designed shells so later milestones drop in without another rebuild.

## Technical notes
- Tailwind v4 tokens in `src/styles.css` under `@theme inline`; fonts loaded via `<link>` in `src/routes/__root.tsx`.
- Panels use the already-installed `react-resizable-panels`; the command palette uses the existing `cmdk`-based `command` component.
- New workspace route under `_authenticated`; existing `terminal`, `execution`, `journal`, `analytics`, `settings` routes are reskinned and reachable both standalone and as panels.
- One migration adds a `workspace_layouts` table (user-scoped, RLS + grants) storing layout name, panel tree JSON and a default flag.
- News provider access lives behind a server function so the provider key stays server-side; TopstepX calls remain in the browser for Topstep compliance.