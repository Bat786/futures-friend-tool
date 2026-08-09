# Reliable confirmation emails and a resend flow that always works

## What is actually going on

Two things need saying before the work:

- There is no email domain configured for this project or workspace, and no email setup has been recorded. Until a sender domain you own is verified, confirmation emails go out through the default Lovable sender with the default template — which is the template producing the link your callback can't verify.
- The problem is not "missing API-key context" in the link. The project's API key is already provisioned automatically and is not something a confirmation link carries. The fix is to send confirmation emails from your own branded template, which emits a `token_hash` + `type` link that the callback page already knows how to verify.

So the ordering is: sender domain first, custom auth email templates second, resend-flow hardening third.

## Step 1 — Sender domain (needs you)

Complete the email domain setup for a domain you own. Nothing else in this plan can produce a working confirmation link until this exists. DNS does not need to finish verifying before step 2, but emails only start sending once it does.

## Step 2 — Custom auth email templates

Scaffold the six auth email templates (signup, magic link, recovery, invite, email change, reauthentication) plus the auth webhook that sends them, then style them to the Signal Desk look: dark-terminal accents, mono wordmark, existing button and border treatment, on the white email body that mail clients require.

The signup and email-change templates build the confirmation URL to point at `/auth-callback` with the token hash and type as query parameters — the exact shape the callback already parses and passes to `verifyOtp`. That is what makes confirmation succeed.

## Step 3 — Resend flow improvements

Today "Resend confirmation email" appears only after a failed sign-in on the auth page, and again on the callback failure screen. Both call resend and show a toast, with no feedback about what to do next and no protection against the built-in hourly send limit.

Changes:

- Extract one shared resend component used by both the auth page and the callback failure screen, so behaviour cannot drift between them.
- Always pass the same `/auth-callback` redirect target, resolved from the current origin, so a link generated from preview returns to preview and a link generated from the live site returns to the live site.
- Surface it earlier: show the resend option on the sign-up tab straight after a successful sign-up ("didn't get it?"), not only after a failed sign-in.
- Replace the fire-and-forget toast with an explicit sent state: confirm the address it went to, tell the user the link expires, and note that the newest link invalidates older ones.
- Add a 60-second cooldown on the button with a visible countdown, and handle the rate-limit error specifically ("too many requests — try again in a minute") instead of showing the raw error text.
- Handle the already-confirmed case: when resend reports the user is already confirmed, say so and link straight to sign in rather than leaving them waiting for an email that will never arrive.
- Raise the project's hourly auth-email allowance from the low default so testing several resends in a row does not trip the limit.

## Step 4 — Verify

After DNS verifies: sign up with a fresh address, confirm the email arrives from your domain with the branded template, click the link, and check the callback lands on the terminal signed in. Then test the resend path from both entry points and confirm the cooldown, rate-limit message, and already-confirmed message all behave.

## Technical notes

- Callback verification logic in `src/routes/auth-callback.tsx` is already correct for `token_hash` + `type` links and does not need reworking; only the email that generates the link changes.
- New shared component (roughly `src/components/auth/resend-confirmation.tsx`) owns email state, cooldown timer, and error mapping; `src/routes/auth.tsx` and `src/routes/auth-callback.tsx` both consume it.
- Templates land under the scaffolded auth email template directory as React Email components; brand values are read from the existing global stylesheet rather than hardcoded new colours.
- Hourly auth-email rate limit is raised through auth configuration; this requires email sending to be active, so it happens after the domain is set.
- Unverified: whether the live-site origin is already in the auth redirect allowlist. If confirmation links from the published site bounce, that allowlist entry is the next thing to check.
