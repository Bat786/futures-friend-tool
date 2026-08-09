CREATE TABLE public.workspace_layouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  panels JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_layouts TO authenticated;
GRANT ALL ON public.workspace_layouts TO service_role;

ALTER TABLE public.workspace_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own workspace layouts"
ON public.workspace_layouts
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_workspace_layouts_updated_at
BEFORE UPDATE ON public.workspace_layouts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_workspace_layouts_user ON public.workspace_layouts (user_id, updated_at DESC);