-- Backfill missing base tables: bookings, saved_addresses, payments
-- These tables already exist in the live database but were never captured in
-- migrations, causing fresh restores/clones to fail with "public.bookings missing".
-- Everything below is idempotent and safe to re-run.

-- =========================================================================
-- 1) saved_addresses
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.saved_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  label TEXT NOT NULL,
  line1 TEXT NOT NULL,
  city TEXT,
  state TEXT,
  pincode TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_addresses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "addr_select_own" ON public.saved_addresses
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "addr_insert_own" ON public.saved_addresses
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "addr_update_own" ON public.saved_addresses
    FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "addr_delete_own" ON public.saved_addresses
    FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP TRIGGER IF EXISTS trg_saved_addresses_updated_at ON public.saved_addresses;
CREATE TRIGGER trg_saved_addresses_updated_at
  BEFORE UPDATE ON public.saved_addresses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS idx_saved_addresses_user ON public.saved_addresses(user_id);

-- =========================================================================
-- 2) bookings
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  partner_id UUID,
  service_id TEXT NOT NULL,
  service_name TEXT NOT NULL,
  category_id TEXT NOT NULL,
  booking_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'searching',
  scheduled_at TIMESTAMPTZ,
  address TEXT NOT NULL,
  professional_id TEXT,
  professional_name TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  duration TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  refund_status TEXT,
  cancellation_fee NUMERIC DEFAULT 0,
  rating INTEGER,
  rating_comment TEXT,
  preferences JSONB,
  start_otp TEXT,
  started_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  arrived_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "bookings_select_own" ON public.bookings
    FOR SELECT USING (
      (auth.uid() = user_id) OR (auth.uid() = partner_id) OR has_role(auth.uid(), 'admin'::app_role)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "bookings_insert_own" ON public.bookings
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "bookings_update_own" ON public.bookings
    FOR UPDATE USING (
      (auth.uid() = user_id) OR (auth.uid() = partner_id) OR has_role(auth.uid(), 'admin'::app_role)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "bookings_delete_own" ON public.bookings
    FOR DELETE USING (
      (auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP TRIGGER IF EXISTS trg_bookings_updated_at_v2 ON public.bookings;
CREATE TRIGGER trg_bookings_updated_at_v2
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Earnings auto-creation trigger (function already exists)
DROP TRIGGER IF EXISTS trg_create_partner_earning_on_bookings ON public.bookings;
CREATE TRIGGER trg_create_partner_earning_on_bookings
  AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.create_partner_earning();

ALTER TABLE public.bookings REPLICA IDENTITY FULL;

CREATE INDEX IF NOT EXISTS idx_bookings_user ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_partner ON public.bookings(partner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_at ON public.bookings(scheduled_at);

-- =========================================================================
-- 3) payments
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  booking_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  method TEXT NOT NULL DEFAULT 'card',
  status TEXT NOT NULL DEFAULT 'pending',
  transaction_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "pay_select_own" ON public.payments
    FOR SELECT USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "pay_insert_own" ON public.payments
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "pay_update_own" ON public.payments
    FOR UPDATE USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP TRIGGER IF EXISTS trg_payments_updated_at ON public.payments;
CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON public.payments(booking_id);

-- =========================================================================
-- 4) Make sure partner_earnings.booking_id is unique (used by ON CONFLICT)
-- =========================================================================
DO $$ BEGIN
  ALTER TABLE public.partner_earnings ADD CONSTRAINT partner_earnings_booking_id_key UNIQUE (booking_id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;