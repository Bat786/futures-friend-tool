# Fix account confirmation and login

The confirmation email currently opens the backend’s raw verification endpoint, which produces the “No API key found in request” JSON shown in the screenshot. The app already has a public `/auth-callback` route that can securely verify `token_hash` links, but no sender domain or custom auth email templates are configured, so that route is never reached by the current email.

## Changes

1. **Set up the sender domain**
   - Connect a real domain you own to the project’s managed email service.
   - DNS verification can continue in the background; templates can be created as soon as the domain is registered.

2. **Create working authentication emails**
   - Scaffold all managed auth templates: signup confirmation, invite, magic link, password recovery, email change, and reauthentication.
   - Make signup confirmation links point to the public app callback with the provider-issued `token_hash` and supported verification `type`, rather than exposing the raw backend verification URL.
   - Style the emails to match Signal Desk while keeping the email body compatible with mail clients.

3. **Keep every confirmation entry point aligned**
   - Ensure initial signup and “Resend confirmation email” both use `/auth-callback` on the current app origin.
   - Keep password recovery routed separately through `/reset-password`.
   - Preserve the existing callback’s expired, reused, malformed, and unsupported-link recovery states.

4. **Verify with a fresh email**
   - Request a new confirmation email after setup; previously sent links will remain broken.
   - Confirm the new link opens Signal Desk, verifies the account, creates a session, and reaches `/terminal`.
   - Verify password sign-in works afterward and a reused link shows the recoverable resend screen instead of raw JSON.

## Technical details

- The browser client performs `verifyOtp`, so the publishable API key is attached automatically; no API key belongs in the email URL.
- The callback accepts only supported verification types and does not expose secrets or trust arbitrary redirects.
- No database schema, trading logic, or account data changes are required.
- If domain DNS is still pending, sending activates after verification and its status can be monitored in Cloud → Emails.