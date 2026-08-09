# Fix email confirmation and sign-in

## What's going wrong

The signup email link points back at the site root, and the app has no page that handles a confirmation result. So when the link is stale, already used, or opened in a different browser, the app receives an error in the URL, shows nothing, and you land on a blank/error page — and the account stays unconfirmed, so sign-in then fails.

Two separate symptoms in the logs confirm this:
- Sign-in rejected with "Email not confirmed" (the confirmation never completed).
- Earlier "Invalid login credentials" attempts before the account existed.

Email confirmation stays on, as requested.

## What I'll build

1. A dedicated confirmation landing page at `/auth/callback`
   - Waits for the session to be established from the link.
   - On success: shows a brief confirmation, then sends you to the terminal.
   - On failure (expired/used link): shows a clear message with a "Resend confirmation email" button instead of a blank screen.

2. Point signup emails at that page
   - Signup now uses `/auth/callback` as the redirect target instead of the bare site root.

3. Resend confirmation on the sign-in screen
   - If sign-in fails with "Email not confirmed", show an inline notice with a "Resend confirmation email" action.

4. Password reset flow (currently missing)
   - "Forgot password?" on the sign-in tab sends a reset email.
   - A public `/reset-password` page to set the new password.

5. Landing page cleanup
   - The root page will pass any auth error/token parameters through to `/auth/callback` rather than silently ignoring them.

## Technical notes

- New public routes: `src/routes/auth.callback.tsx`, `src/routes/reset-password.tsx` (top-level, SSR-safe, no auth gate).
- `src/routes/auth.tsx`: `emailRedirectTo: ${window.location.origin}/auth/callback`; add `supabase.auth.resend({ type: 'signup', email })` and `resetPasswordForEmail(email, { redirectTo: origin + '/reset-password' })`.
- Callback page relies on the browser client's `detectSessionInUrl` plus `onAuthStateChange`, and reads `error`/`error_code`/`error_description` from both the query string and hash for the failure state.
- Reset page verifies a recovery session before calling `supabase.auth.updateUser({ password })`.
- No database or schema changes.

## After the fix

Your existing account is unconfirmed — the resend button on the sign-in screen will issue a fresh link that lands on the new confirmation page.
