ALTER TABLE public.trades ADD CONSTRAINT trades_side_check CHECK (side IN ('buy','sell'));
ALTER TABLE public.trades ADD CONSTRAINT trades_status_check CHECK (status IN ('open','closed','cancelled'));
ALTER TABLE public.fills ADD CONSTRAINT fills_fill_type_check CHECK (fill_type IS NULL OR fill_type IN ('entry','exit','partial_entry','partial_exit'));
ALTER TABLE public.signals ADD CONSTRAINT signals_direction_check CHECK (direction IS NULL OR direction IN ('bullish','bearish','neutral'));

ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.daily_summary ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_trades_updated_at BEFORE UPDATE ON public.trades
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_daily_summary_updated_at BEFORE UPDATE ON public.daily_summary
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_risk_settings_updated_at BEFORE UPDATE ON public.risk_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS trades_setup_idx ON public.trades (user_id, setup_tag);
CREATE INDEX IF NOT EXISTS trades_status_idx ON public.trades (user_id, status);
CREATE INDEX IF NOT EXISTS signals_indicator_idx ON public.signals (indicator_name);
CREATE INDEX IF NOT EXISTS fills_trade_idx ON public.fills (trade_id);