# Get you into the terminal without email confirmation

Short answer on the domain: a sender domain is **not** included in the subscription. It is a real domain you must own (buy it in Project Settings -> Domains on a paid plan, or at any registrar). Until then, custom confirmation emails cannot be generated.

But you do not need a domain to log in. The confirmation email is the only broken piece, so the fix is to stop requiring it.

## Changes

1. **Turn off email confirmation for signup**
   - Enable auto-confirm on the project's auth settings so a new signup is immediately signed in and lands on the terminal.
   - Existing unconfirmed accounts get confirmed so your current email/password works.
   - No fake link, no dead callback page.

2. **Keep the real auth flow intact**
   - No hardcoded credentials, no client-side "skip login" flag, no unprotected routes.
   - `/auth-callback` and the resend flow stay as-is for when the domain is ready.

3. **Verify end to end**
   - Sign up (or sign in with your existing account), confirm the session lands on `/terminal`, and check the sidebar, execution, journal, analytics and settings pages render for a signed-in user.

## When you get a domain later

Re-enable confirmation, scaffold branded auth email templates pointing at `/auth-callback`, and raise the hourly auth-email limit. Nothing built now has to be undone.

## Technical details

- Uses the auth configuration tool (`auto_confirm_email: true`); no schema changes.
- Existing rows in the auth users table with a null confirmation timestamp are confirmed so old signups are not stranded.
- Route guards, RLS policies and the `_authenticated` layout are unchanged.
