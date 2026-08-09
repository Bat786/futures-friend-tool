# Working confirmation emails + a full Signal Desk redesign

Two tracks in one pass: fix the email confirmation loop for good, and rebuild the interface on a new design system.

---

## Track A — Confirmation emails that actually work

### What's actually going on

Two corrections worth stating up front:

- There is no email domain configured for this project or workspace, and no email setup has been recorded. Until a sender domain you own is verified, confirmation emails go out through the default Lovable sender with the default template — the one producing the link your callback can't verify.
- The problem is not "missing API-key context" in the link. The project's API key is already provisioned automatically and is not something a confirmation link carries. The fix is sending confirmations from your own branded template, which emits a `token_hash` + `type` link the callback page already knows how to verify.

### Step 1 — Sender domain (needs you)

Complete email domain setup for a domain you own. Nothing else here can produce a working link until this exists. DNS doesn't need to finish verifying before step 2, but emails only start sending once it does.

### Step 2 — Custom auth email templates

Scaffold the six auth templates (signup, magic link, recovery, invite, email change, reauthentication) plus the sending webhook, styled to the new Signal Desk identity — Neon Mint accent, Sora wordmark — on the white email body mail clients require.

Signup and email-change templates build the confirmation URL pointing at `/auth-callback` with token hash and type as query parameters: exactly the shape the callback parses and passes to `verifyOtp`.

### Step 3 — Resend flow improvements

Today "Resend confirmation email" appears only after a failed sign-in, and again on the callback failure screen — both fire a toast with no guidance and no protection against the hourly send limit.

- One shared resend component used by the auth page and the callback screen, so behaviour can't drift.
- Always pass the same `/auth-callback` redirect resolved from the current origin, so a preview link returns to preview and a live link returns to live.
- Surface it earlier: offer resend right after a successful sign-up, not only after a failed sign-in.
- Replace the toast with an explicit sent state: confirm the address, note the link expires, note the newest link invalidates older ones.
- 60-second cooldown with a visible countdown; map the rate-limit error to plain language instead of raw error text.
- Handle already-confirmed: say so and link to sign in rather than waiting for an email that never arrives.
- Raise the hourly auth-email allowance above the low default so repeated testing doesn't trip it.

---

## Track B — Redesign

### Direction

Locked from your picks, applied everywhere — landing, auth, terminal, execution, journal, analytics, settings.

- **Palette — Neon Mint:** `#0d1b2a` base, `#1b4332` raised surfaces, `#2dd4a8` primary, `#73ffb8` highlight. High-contrast, screen-forward. Profit stays mint, loss gets a matched red, warning a matched amber — all rebuilt as oklch tokens.
- **Type — Sora + Manrope:** Sora for headings and the wordmark, Manrope for body and UI. A monospace face stays for numeric columns, prices and P&L so figures stay tabular and aligned. Loaded via link tags in the root head, registered as theme tokens.
- **Layout — Dashboard:** persistent collapsible sidebar nav replacing today's top nav bar, with a slim top bar for account and session state, and multi-panel content regions underneath.

### What changes per screen

- **Landing** — full-bleed dark hero on the new palette, Sora display headline, live-signal visual, supervision message, single sign-in call to action.
- **Auth / callback / reset** — restyled to the new tokens, with the improved resend flow from Track A built into the redesigned cards.
- **App shell** — shadcn Sidebar with icon-collapse (never fully disappears), trigger in the top bar, active route highlighted, mobile drawer behaviour.
- **Terminal** — chart as the dominant panel, signal gauge and indicator breakdown as flanking panels, all on a consistent panel treatment.
- **Execution** — order ticket, risk gate state, supervision watchdog and flatten-all promoted into clearly separated zones with unmistakable destructive styling.
- **Journal / Analytics** — denser tables with tabular numerals, mint/red P&L coding, restyled charts using the new chart tokens.
- **Settings** — grouped risk-limit cards with clearer field hierarchy.

### Craft details

Every value lands as a semantic token in `src/styles.css` — no hardcoded colors in components. shadcn variants get extended rather than overridden inline. Motion stays restrained: fade and scale on panel entry, no animation on live numeric values where movement would read as a price change.

---

## On Figma

Lovable can't reach Figma from here. Live access needs the Lovable Desktop app, then Figma Desktop in Dev Mode with the local MCP server enabled and connected under Settings → Connectors. It's read-only. If you'd rather skip that, send screenshots or exports of your frames and I'll match them — otherwise this plan builds the direction from your palette, type and layout picks on shadcn primitives.

## Technical notes

- Callback verification in `src/routes/auth-callback.tsx` is already correct for `token_hash` + `type` links; only the email generating the link changes.
- New shared `src/components/auth/resend-confirmation.tsx` owns email state, cooldown and error mapping; consumed by `auth.tsx` and `auth-callback.tsx`.
- Auth email templates land as React Email components in the scaffolded directory; brand values read from the new tokens.
- Hourly auth-email limit raised through auth configuration, after the domain is active.
- Redesign is presentation-only: `src/styles.css` tokens, `src/components/app-shell.tsx` replaced by a sidebar shell, plus per-route markup and class changes. Signal engine, indicators, risk, journal and broker logic are untouched.
- Fonts via `<link>` in `src/routes/__root.tsx` head, never a CSS URL import.
- No database or schema changes.
- Unverified: whether the live-site origin is in the auth redirect allowlist. If links from the published site bounce, that's the next thing to check.
