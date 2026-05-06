-- Restore onboarding flow by adding the missing UPDATE/DELETE policies to
-- user_roles. The original migration (20260422223410…) shipped only INSERT
-- and SELECT policies, so any client-side `upsert` that hit the ON CONFLICT
-- branch (which becomes an UPDATE) was rejected with:
--   "new row violates row-level security policy for table user_roles"
--
-- The (user_id, role) UNIQUE constraint means the row's identity never
-- changes during an upsert, so the policy can be the same auth.uid() check
-- used for INSERT/SELECT.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'user_roles'
      AND policyname = 'Users can update own roles'
  ) THEN
    CREATE POLICY "Users can update own roles"
      ON public.user_roles FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'user_roles'
      AND policyname = 'Users can delete own roles'
  ) THEN
    CREATE POLICY "Users can delete own roles"
      ON public.user_roles FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END
$$;
