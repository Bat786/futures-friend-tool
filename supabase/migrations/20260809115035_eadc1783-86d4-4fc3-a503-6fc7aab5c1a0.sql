ALTER TABLE public.risk_settings
  ADD COLUMN IF NOT EXISTS weight_rsi numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS weight_vwap numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS weight_macd numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS weight_momentum numeric NOT NULL DEFAULT 1;

ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS risk_at_entry numeric;