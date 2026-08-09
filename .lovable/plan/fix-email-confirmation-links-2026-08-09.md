# Fix email confirmation links

The screenshot confirms the email is opening the backend’s raw `/auth/v1/verify` endpoint directly. That browser request has no API-key header, so it is rejected before the account can be confirmed. The hosted backend itself is healthy, and the auth logs show confirmation emails being requested successfully but no successful verification afterward.

## Changes

1. **Route confirmation through the app**
   - Make confirmation emails open `/auth-callback` with the one-time `token_hash` and confirmation type instead of opening the raw backend endpoint.
   - Keep the callback public so it works before the user has a session.

2. **Complete verification explicitly**
   - Update `/auth-callback` to validate the callback parameters and call `supabase.auth.verifyOtp(...)`.
   - The generated browser client then supplies the required publishable API key automatically.
   - Preserve support for session/hash callbacks, and show the actual verification error when a link is expired, reused, or malformed.

3. **Align all auth email entry points**
   - Use the same callback URL for account creation and “resend confirmation.”
   - Keep password recovery on `/reset-password`; do not mix signup confirmation and recovery behavior.

4. **Verify the real mobile flow**
   - Request one fresh confirmation email after the change; old emails will still contain the broken URL.
   - Open the fresh link, confirm it lands on the app callback rather than raw JSON, then verify password sign-in reaches `/terminal`.
   - Check the auth logs for a successful verification and ensure expired/reused links produce a recoverable resend screen.

## Technical details

- The email template link will use the app callback plus the provider-issued `TokenHash`; no secret or session token will be exposed in app code.
- `/auth-callback` will accept only supported verification types and will never trust an arbitrary redirect URL.
- No database schema or trading logic changes are needed.