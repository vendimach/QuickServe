-- The original `app_role` enum only had 'customer' and 'partner'. The
-- AdminGuard route + AuthContext role priority both reference 'admin', so
-- the enum needs the third value before any user_roles row can carry it.
--
-- ALTER TYPE ... ADD VALUE must run outside a transaction in older
-- Postgres, but Supabase's migration runner handles that automatically.
-- IF NOT EXISTS makes this idempotent so re-running is safe.

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';
