# Rebrand to AETHRON + named product modules

Rename the product from AETHRA to AETHRON everywhere, and adopt your module names as the official in-app naming for each surface.

## Module naming

| Surface | New name |
| --- | --- |
| Workspace / command center | AETHRON Terminal |
| AI panel + narrative intelligence | AETHRON AI |
| Risk engine, limits, settings | AETHRON Risk |
| Signal gauge, composite score, terminal signal view | AETHRON Signals |
| Positions / order flow + execution ticket | AETHRON Flow |
| Multi-symbol scanner panel | AETHRON Scanner |

Sidebar keeps short labels (Terminal, Signals, Flow, Risk, Scanner, Journal, Analytics) with the full "AETHRON X" name shown in page headers, panel title bars and page titles, so navigation stays scannable.

## What changes

1. **Brand assets** — regenerate the logo mark as an AETHRON "A" in the existing hot pink / electric purple gradient; update the favicon.
2. **Logo components** — rename `AethraMark` / `AethraWordmark` to `AethronMark` / `AethronWordmark`, file renamed to `aethron-logo.tsx`, all import sites updated.
3. **Copy and SEO** — every route `head()` (landing, auth, auth callback, reset password, workspace, terminal, execution, journal, analytics, settings) gets AETHRON titles and descriptions, each unique and within length limits.
4. **Workspace panels** — panel titles/kickers in `workspace-layouts.ts` renamed to the module names above; AI panel body copy updated.
5. **Navigation and headers** — sidebar wordmark, page title map, landing hero and auth screens rebranded.
6. **Styles** — comment header and `aethra-flash-*` keyframes renamed to `aethron-*`.

No colour, layout, data model or execution-path changes: TopstepX calls stay browser-origin, and the database is untouched.

## Technical notes

- Pure frontend/presentation rename plus one new generated image asset; no migrations, no server function signature changes.
- Panel keys in saved `workspace_layouts` rows stay the same (`ai`, `risk`, `scanner`, ...), so existing saved layouts keep working — only display titles change.