-- ============================================================
-- Realtime overhaul: location tracking + partner-first flow
-- ============================================================

-- 1. Location columns on bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS user_lat  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS user_lng  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS partner_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS partner_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS partner_user_id UUID;

-- 2. Home location on profiles (partners store their base location)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS home_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS home_lng DOUBLE PRECISION;

-- 3. Haversine distance function (returns km)
CREATE OR REPLACE FUNCTION public.haversine(
  lat1 DOUBLE PRECISION, lng1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION, lng2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  R  CONSTANT DOUBLE PRECISION := 6371;
  dlat DOUBLE PRECISION := radians(lat2 - lat1);
  dlng DOUBLE PRECISION := radians(lng2 - lng1);
  a    DOUBLE PRECISION;
BEGIN
  a := sin(dlat / 2)^2
     + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng / 2)^2;
  RETURN R * 2 * asin(sqrt(a));
END;
$$;

-- 4. Allow partners to SELECT searching bookings (to see available jobs)
DO $$ BEGIN
  CREATE POLICY "bookings_partner_view_searching" ON public.bookings
    FOR SELECT USING (
      status = 'searching'
      AND EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role::text = 'partner'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5. Allow partners to UPDATE (accept) a searching booking where no partner is set yet
DO $$ BEGIN
  CREATE POLICY "bookings_partner_accept" ON public.bookings
    FOR UPDATE USING (
      status = 'searching'
      AND partner_id IS NULL
      AND EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role::text = 'partner'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6. Index to speed up partner querying available jobs
CREATE INDEX IF NOT EXISTS idx_bookings_status_partner ON public.bookings(status) WHERE status = 'searching';
