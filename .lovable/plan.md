# Set up Signal Desk email domain and working confirmation emails

## Goal

Use `signaldesk.com` as the sender domain for Signal Desk so confirmation emails come from a branded address and their links route through the app's `/auth-callback` page instead of the raw backend endpoint.

## Prerequisites

`signaldesk.com` must be a domain you own or are willing to buy. If you do not yet own it, the first step is purchasing it through Project Settings → Domains (paid plans) or an external registrar before DNS setup can complete.

## Changes

1. **Register `signaldesk.com` as the sender domain**
   - Run the email domain setup flow for `signaldesk.com`.
   - Add the required DNS records (NS delegation for the email subdomain) at the domain registrar.
   - DNS verification can take up to 72 hours; templates and branding can be created while it propagates.

2. **Scaffold custom auth email templates**
   - Generate the six managed auth templates: signup, invite, magic link, password recovery, email change, reauthentication.
   - Generate the auth email webhook route at `/lovable/email/auth/webhook`.
   - Ensure the signup and email-change templates build the confirmation URL as `https://signaldesk.com/auth-callback?token_hash=...&type=...` using the current app origin.

3. **Brand the templates to Signal Desk**
   - Apply the Neon Mint palette (`#0d1b2a`, `#2dd4a8`, `#73ffb8`) and Sora/Manrope typography to the email header and CTA.
   - Keep the email body background `#ffffff` for mail-client compatibility.
   - Use the Signal Desk wordmark as the sender display name.

4. **Harden the resend confirmation flow**
   - Share the `ResendConfirmation` component across the sign-in page and `/auth-callback` failure state.
   - Always resolve the callback URL from `window.location.origin` so preview and live environments each send links back to themselves.
   - Add a 60-second cooldown with a visible countdown.
   - Map rate-limit and already-confirmed errors to plain-language messages.

5. **Raise the hourly auth-email limit**
   - Increase the GoTrue `rate_limit_email_sent` cap above the default so resend testing and legitimate signups are not throttled.

6. **Verify the end-to-end flow**
   - Request a fresh confirmation email after setup.
   - Confirm the new link opens `https://signaldesk.com/auth-callback` (or the current preview origin), verifies the account, creates a session, and redirects to `/terminal`.
   - Confirm a reused/expired link shows the recoverable resend screen instead of raw JSON.
   - Confirm password sign-in works after confirmation.

## Technical details

- The browser client calls `supabase.auth.verifyOtp({ token_hash, type })`, so the publishable API key is attached automatically. No API key is placed in the email URL.
- `/auth-callback` already validates supported verification types and rejects unsupported links. No secret or arbitrary redirect is trusted.
- The auth email webhook delegates verification and dispatch to the managed Lovable auth email handler; no manual signature verification or queue is added.
- No database schema or trading logic changes are needed.
- If DNS verification is still pending after scaffolding, emails activate automatically once verification completes and can be monitored in Cloud → Emails.
