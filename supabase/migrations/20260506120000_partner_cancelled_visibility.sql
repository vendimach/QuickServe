-- ============================================================
-- Realtime cancellation visibility for partners
-- ============================================================
-- Problem: when a customer cancels a 'searching' booking, the row's
-- new status becomes 'cancelled'. Supabase Realtime checks RLS
-- against the NEW row state for UPDATE events. The existing
-- "bookings_partner_view_searching" policy only allows SELECT when
-- status = 'searching', so partners never receive the cancellation
-- UPDATE event and the request lingers in their incoming list.
--
-- Fix: grant partners SELECT on cancelled / refunded rows so the
-- cancellation event reaches them. They were already entitled to see
-- the row when it was 'searching', so this does not widen exposure.

DO $$ BEGIN
  CREATE POLICY "bookings_partner_view_cancelled" ON public.bookings
    FOR SELECT USING (
      status IN ('cancelled', 'refunded')
      AND EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role::text = 'partner'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
