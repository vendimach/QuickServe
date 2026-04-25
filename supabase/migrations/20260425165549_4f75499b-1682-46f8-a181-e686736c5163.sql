
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

CREATE POLICY "pm_select_own" ON public.payment_methods
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "pm_insert_own" ON public.payment_methods
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pm_update_own" ON public.payment_methods
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "pm_delete_own" ON public.payment_methods
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_pm_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Profiles: add address fields & about
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_address_id uuid,
  ADD COLUMN IF NOT EXISTS about text;

-- Bookings updated_at trigger
CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- saved_addresses updated_at trigger
CREATE TRIGGER trg_addr_updated_at
  BEFORE UPDATE ON public.saved_addresses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- profiles updated_at trigger
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Realtime for bookings
ALTER TABLE public.bookings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
