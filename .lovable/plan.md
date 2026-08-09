# Connect your TopstepX account from Settings

Right now the terminal can only reach TopstepX through project-level environment credentials, which are not set — so Settings shows a read-only "Not configured" card with no way to enter anything. This adds a real per-user connection form.

## What you'll see

A new **Broker connection** card on `/settings` with:

- TopstepX username and API key fields (key masked, never shown again after saving)
- Environment selector: **Demo / evaluation** (default) or **Live**, with a typed confirmation before Live can be saved
- A **Test connection** button that authenticates and lists your Topstep accounts, showing account name, balance and status
- Connection status: connected/not connected, environment, gateway URL, last verified time
- A **Disconnect** button that wipes the stored credentials

Once connected, the account dropdown on `/execution` fills from your real Topstep accounts instead of being empty, and charts switch from simulated bars to live data.

## How credentials are handled

Each signed-in user stores their own credentials — nobody else's orders can touch your account.

- Credentials are saved in the existing `broker_accounts` table, keyed to your user id, with row-level security so only you can read your row.
- The API key is encrypted at rest (AES-256-GCM) using a server-side key, so it is never stored as readable text and never leaves the server.
- The key is never returned to the browser — only status flags (connected, environment, masked username) come back.

## Technical notes

- Migration: add `api_key_ciphertext`, `username`, `environment`, `last_verified_at` to `broker_accounts`; RLS policies scoped to `auth.uid()` plus grants for `authenticated` and `service_role`. Encryption key generated as a project secret.
- `src/lib/topstepx.server.ts`: `readConfig()` becomes `resolveConfig(userId)` — loads and decrypts the user's row, falling back to the existing env vars when present (so nothing currently working breaks). `isDemo` follows the stored environment.
- New `src/lib/broker-credentials.functions.ts`: `saveBrokerCredentials`, `testBrokerConnection`, `disconnectBroker`, `getBrokerStatus` — all behind `requireSupabaseAuth`, all returning only non-sensitive fields.
- Every existing broker server function (`getAccounts`, `getPositions`, `getOrders`, `submitOrder`, `flattenAll`, `fetchBars`, `resolveContractId`) is threaded with the caller's user id so it uses that user's credentials.
- Live mode is gated: the confirmation step and a persistent "LIVE" badge in the app header, since live orders are final.
