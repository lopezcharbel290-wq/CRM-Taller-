DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='roles_update_jefe' AND tablename='user_roles') THEN
    CREATE POLICY "roles_update_jefe" ON public.user_roles
      FOR UPDATE TO authenticated
      USING (public.has_role(auth.uid(),'jefe_taller'))
      WITH CHECK (public.has_role(auth.uid(),'jefe_taller'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='roles_delete_jefe' AND tablename='user_roles') THEN
    CREATE POLICY "roles_delete_jefe" ON public.user_roles
      FOR DELETE TO authenticated
      USING (public.has_role(auth.uid(),'jefe_taller'));
  END IF;
END $$;