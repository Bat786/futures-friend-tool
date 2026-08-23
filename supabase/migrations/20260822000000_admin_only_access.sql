-- Defense in depth: authenticated Supabase API access is restricted to the sole
-- application administrator, even if a legacy non-admin account still exists.
CREATE OR REPLACE FUNCTION public.is_app_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT lower(COALESCE(auth.jwt() ->> 'email', '')) = 'zeeshad91@gmail.com'
$$;

REVOKE ALL ON FUNCTION public.is_app_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_app_admin() TO authenticated, service_role;

ALTER POLICY "own profile" ON public.profiles
  USING (auth.uid() = id AND public.is_app_admin())
  WITH CHECK (auth.uid() = id AND public.is_app_admin());
ALTER POLICY "own broker accounts" ON public.broker_accounts
  USING (auth.uid() = user_id AND public.is_app_admin())
  WITH CHECK (auth.uid() = user_id AND public.is_app_admin());
ALTER POLICY "own risk settings" ON public.risk_settings
  USING (auth.uid() = user_id AND public.is_app_admin())
  WITH CHECK (auth.uid() = user_id AND public.is_app_admin());
ALTER POLICY "own trades" ON public.trades
  USING (auth.uid() = user_id AND public.is_app_admin())
  WITH CHECK (auth.uid() = user_id AND public.is_app_admin());
ALTER POLICY "own signals" ON public.signals
  USING (auth.uid() = user_id AND public.is_app_admin())
  WITH CHECK (auth.uid() = user_id AND public.is_app_admin());
ALTER POLICY "own fills" ON public.fills
  USING (auth.uid() = user_id AND public.is_app_admin())
  WITH CHECK (auth.uid() = user_id AND public.is_app_admin());
ALTER POLICY "own daily summary" ON public.daily_summary
  USING (auth.uid() = user_id AND public.is_app_admin())
  WITH CHECK (auth.uid() = user_id AND public.is_app_admin());
ALTER POLICY "bars readable by signed in users" ON public.bar_cache
  USING (public.is_app_admin());
ALTER POLICY "own workspace layouts" ON public.workspace_layouts
  USING (auth.uid() = user_id AND public.is_app_admin())
  WITH CHECK (auth.uid() = user_id AND public.is_app_admin());
