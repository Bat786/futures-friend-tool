ALTER TABLE public.broker_accounts
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS api_key_ciphertext text,
  ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'demo',
  ADD COLUMN IF NOT EXISTS last_verified_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

ALTER TABLE public.broker_accounts ALTER COLUMN label SET DEFAULT 'TopstepX';
ALTER TABLE public.broker_accounts ALTER COLUMN external_account_id SET DEFAULT '';

ALTER TABLE public.broker_accounts
  DROP CONSTRAINT IF EXISTS broker_accounts_environment_check;
ALTER TABLE public.broker_accounts
  ADD CONSTRAINT broker_accounts_environment_check CHECK (environment IN ('demo','live'));

CREATE UNIQUE INDEX IF NOT EXISTS broker_accounts_user_broker_key
  ON public.broker_accounts (user_id, broker);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.broker_accounts TO authenticated;
GRANT ALL ON public.broker_accounts TO service_role;

DROP TRIGGER IF EXISTS trg_broker_accounts_updated_at ON public.broker_accounts;
CREATE TRIGGER trg_broker_accounts_updated_at
  BEFORE UPDATE ON public.broker_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();