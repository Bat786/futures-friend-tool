# Move TopstepX activity to the user's personal device

The pasted Topstep Terms of Use say: **"All trading activity must originate from your personal device. The use of VPS, VPNs, and remote servers is prohibited."** Today, every TopstepX API call is made from Lovable Cloud server functions (`createServerFn`), which is a remote server. This plan re-architects the terminal so the browser on your personal device talks directly to TopstepX, while the server only keeps your journal, settings, and analytics.

## What you'll see after the change

- **Connection card** in `/settings` still asks for TopstepX username, API key, and environment (Demo/Live), but the key is now encrypted locally in your browser with a passphrase you choose. The server never sees the key.
- **Terminal** (`/terminal`) fetches bars and computes the signal directly from the browser using your key. The "LIVE" / "SIM" badge becomes a real "Live data from TopstepX" indicator.
- **Execution** (`/execution`) reads accounts, positions, and sends orders directly from the browser. The risk gate still runs client-side for instant feedback, and after an order succeeds the trade + signal snapshot is logged to the server.
- **Kill switch** flattens positions and cancels orders directly from the browser.
- **New compliance notice** visible on the terminal and execution pages: "Orders are sent directly from this device to TopstepX. No remote server handles your credentials."
- **Disconnect** wipes the locally encrypted key from your browser.

## Security model

- API key is encrypted at rest in the browser using `SubtleCrypto` (AES-256-GCM) with a key derived from a user passphrase via PBKDF2. The passphrase is never sent to the server.
- While the terminal is open, the decrypted key lives in a React context in memory only; it is not written to `localStorage` plaintext.
- The server retains only journal, analytics, risk settings, and your user identity. No broker credential table is needed.
- Server-side broker functions (`submitOrder`, `getAccounts`, etc.) are removed.

## Technical changes

### 1. Client-side broker client

Create `src/lib/topstepx.client.ts` — a browser-safe version of `src/lib/topstepx.server.ts` that uses `fetch` directly from the browser. It will:
- Authenticate with `/Auth/loginKey` using the username + API key from the vault.
- Call `/Account/search`, `/Position/searchOpen`, `/Order/search`, `/Order/place`, `/Order/cancel`, `/Position/closeContract`, `/Contract/search`, `/History/retrieveBars`.
- Cache the session token in memory for up to 12 hours.
- Return the same DTO shapes as today so UI components change minimally.

### 2. Browser credential vault

Create `src/lib/broker-vault.ts`:
- `deriveKey(passphrase, salt)` → PBKDF2 + AES-GCM key.
- `saveCredentials({ username, apiKey, environment }, passphrase)` → encrypt the key, store the ciphertext + salt + username + environment in `localStorage` / `IndexedDB`.
- `loadCredentials(passphrase)` → decrypt and return credentials.
- `clearCredentials()` → wipe the vault.
- `hasCredentials()` → true if a saved entry exists.
- Provide a React context (`BrokerConfigProvider`) that keeps decrypted credentials in memory and exposes the current config to UI components.

### 3. Move data and order flows to the client

- `src/routes/_authenticated/terminal.tsx`:
  - Remove `getBars` server function call.
  - Use `fetchBars` from a new client-side helper that calls `topstepx.client.ts` using the vault config.
  - If no credentials are configured, fall back to simulated bars (same behavior as today).
- `src/routes/_authenticated/execution.tsx`:
  - Remove `getAccounts`, `getPositions`, `submitOrder`, `flattenAll`, `getBrokerStatus` server functions.
  - Use client-side helpers from `topstepx.client.ts` for accounts, positions, order placement, and flattening.
  - After a successful order, call a new server function `logOrderEntry` to persist the trade row and signal readings to the journal (no credentials sent).
  - Keep the risk gate client-side using `getRiskState` from the server.
- `src/components/broker-connect-card.tsx`:
  - Replace the server save/test/disconnect mutations with vault operations.
  - Test connection by calling `searchAccounts` directly from the browser.
  - Disconnect wipes the vault.

### 4. Server-side cleanup

- Delete or deprecate `src/lib/broker.functions.ts` (all broker RPCs).
- Delete or deprecate `src/lib/broker-credentials.functions.ts` (save/test/disconnect).
- Delete `src/lib/broker-credentials.server.ts` and `src/lib/credential-crypto.server.ts` (no server-side key storage).
- Remove `BROKER_CREDENTIAL_SECRET` from project secrets.
- Keep `src/lib/journal.functions.ts` for `getRiskState`, `updateRiskSettings`, `listTrades`, `saveTrade`, `deleteTrade`.
- Add a new server function `logOrderEntry` to `src/lib/journal.functions.ts` that accepts the post-trade snapshot (trade fields + signal readings) and inserts into `trades` and `signals` tables. It does not touch the broker.

### 5. Database migration

Drop the server-side credential columns from `public.broker_accounts` since the key is no longer stored there:

```sql
ALTER TABLE public.broker_accounts
  DROP COLUMN IF EXISTS api_key_ciphertext,
  DROP COLUMN IF EXISTS environment,
  DROP COLUMN IF EXISTS username,
  DROP COLUMN IF EXISTS last_verified_at,
  DROP COLUMN IF EXISTS updated_at;
```

If the table becomes empty after removing credential columns, consider removing it entirely. For now the migration will keep only `id`, `user_id`, `broker`, `label`, `external_account_id`, `is_demo` if needed by other code, or drop the table if unused.

### 6. UI/compliance additions

- Add a prominent notice on `/execution` and `/terminal` stating that broker credentials and order traffic stay on the user's device.
- In `src/components/app-shell.tsx`, replace the generic "Live" badge with a "Device" / "Remote" indicator. After this change it should show "Device" (or similar) to reflect the compliant execution path.
- Update the connection card description to say the key is encrypted in the browser and never sent to the server.

## CORS check

TopstepX must allow cross-origin requests from the browser. If the gateway responds with CORS errors, the plan will need a small adjustment (e.g., documenting that the browser is the only allowed execution path and testing via a browser-specific flow). The first step of implementation is a quick test call from the browser to `/Account/search` to confirm the gateway accepts browser-origin traffic.

## Execution order

1. Create `src/lib/topstepx.client.ts` and `src/lib/broker-vault.ts`.
2. Build the `BrokerConfigProvider` and update `src/components/broker-connect-card.tsx` to use the vault.
3. Update `/terminal` and `/execution` to call the client-side broker helpers.
4. Add `logOrderEntry` to journal functions and call it from the execution page after order success.
5. Remove server-side broker functions and credential files.
6. Run the migration to drop `api_key_ciphertext` and related columns.
7. Remove `BROKER_CREDENTIAL_SECRET` from secrets.
8. Verify browser CORS and run tests/build.
