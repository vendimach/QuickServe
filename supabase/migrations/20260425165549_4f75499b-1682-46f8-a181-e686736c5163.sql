
-- Ensure base booking/address tables exist before later ALTER/TRIGGER statements.
CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  partner_id uuid,
  service_id text NOT NULL DEFAULT 'unknown',
  service_name text NOT NULL DEFAULT 'Service',
  category_id text NOT NULL DEFAULT 'general',
  booking_type text NOT NULL DEFAULT 'immediate',
  status text NOT NULL DEFAULT 'searching',
  scheduled_at timestamptz,
  address text NOT NULL DEFAULT '',
  professional_id text,
  professional_name text,
  price numeric NOT NULL DEFAULT 0,
  duration text,
  payment_status text NOT NULL DEFAULT 'pending',
  payment_method text,
  refund_status text,
  rating integer,
  rating_comment text,
  preferences jsonb,
  confirmed_at timestamptz,
  arrived_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.saved_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  label text NOT NULL,
  line1 text NOT NULL,
  city text,
  state text,
  pincode text,
  latitude double precision,
  longitude double precision,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.saved_addresses ENABLE ROW LEVEL SECURITY;

-- Bookings: OTP verification + better cancellation tracking
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS start_otp text,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS cancellation_fee numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS razorpay_order_id text,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id text;

-- Payment methods table
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('card','upi','wallet','cod')),
  label text NOT NULL,
  last4 text,
  brand text,
  upi_id text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "pm_select_own" ON public.payment_methods FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "pm_insert_own" ON public.payment_methods FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "pm_update_own" ON public.payment_methods FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "pm_delete_own" ON public.payment_methods FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP TRIGGER IF EXISTS trg_pm_updated_at ON public.payment_methods;
CREATE TRIGGER trg_pm_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Profiles: add address fields & about
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_address_id uuid,
  ADD COLUMN IF NOT EXISTS about text;

-- Bookings updated_at trigger
DROP TRIGGER IF EXISTS trg_bookings_updated_at ON public.bookings;
CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- saved_addresses updated_at trigger
DROP TRIGGER IF EXISTS trg_addr_updated_at ON public.saved_addresses;
CREATE TRIGGER trg_addr_updated_at
  BEFORE UPDATE ON public.saved_addresses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- profiles updated_at trigger
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Realtime for bookings
ALTER TABLE public.bookings REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
  END IF;
END $$;
