ALTER TABLE public.broker_accounts
  DROP COLUMN IF EXISTS username,
  DROP COLUMN IF EXISTS api_key_ciphertext,
  DROP COLUMN IF EXISTS environment,
  DROP COLUMN IF EXISTS last_verified_at;