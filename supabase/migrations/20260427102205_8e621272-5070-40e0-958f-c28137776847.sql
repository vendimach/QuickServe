-- 1) PARTNER WEEKLY SCHEDULE -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partner_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL,
  days TEXT[] NOT NULL DEFAULT '{}'::text[],
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_schedule_partner ON public.partner_schedule(partner_id);

ALTER TABLE public.partner_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schedule_select_own"
  ON public.partner_schedule FOR SELECT
  USING (auth.uid() = partner_id);
CREATE POLICY "schedule_insert_own"
  ON public.partner_schedule FOR INSERT
  WITH CHECK (auth.uid() = partner_id);
CREATE POLICY "schedule_update_own"
  ON public.partner_schedule FOR UPDATE
  USING (auth.uid() = partner_id);
CREATE POLICY "schedule_delete_own"
  ON public.partner_schedule FOR DELETE
  USING (auth.uid() = partner_id);

CREATE TRIGGER trg_partner_schedule_updated_at
BEFORE UPDATE ON public.partner_schedule
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- 2) PARTNER AVAILABILITY FLAGS ----------------------------------------------
CREATE TABLE IF NOT EXISTS public.partner_availability (
  partner_id UUID PRIMARY KEY,
  available_now BOOLEAN NOT NULL DEFAULT false,
  listed_today BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "availability_select_own"
  ON public.partner_availability FOR SELECT
  USING (auth.uid() = partner_id);
CREATE POLICY "availability_insert_own"
  ON public.partner_availability FOR INSERT
  WITH CHECK (auth.uid() = partner_id);
CREATE POLICY "availability_update_own"
  ON public.partner_availability FOR UPDATE
  USING (auth.uid() = partner_id);

CREATE TRIGGER trg_partner_availability_updated_at
BEFORE UPDATE ON public.partner_availability
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- 3) NOTIFICATIONS -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  kind TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  body TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_select_own"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "notif_insert_own"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notif_update_own"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "notif_delete_own"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;


-- 4) PARTNER EARNINGS (credit account) ---------------------------------------
CREATE TABLE IF NOT EXISTS public.partner_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL,
  booking_id UUID NOT NULL UNIQUE,
  service_name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  customer_name TEXT,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_earnings_partner ON public.partner_earnings(partner_id, earned_at DESC);

ALTER TABLE public.partner_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "earnings_select_own"
  ON public.partner_earnings FOR SELECT
  USING (auth.uid() = partner_id);
CREATE POLICY "earnings_insert_own"
  ON public.partner_earnings FOR INSERT
  WITH CHECK (auth.uid() = partner_id);


-- 5) AUTO-CREATE EARNINGS WHEN BOOKING COMPLETED & PAID ----------------------
CREATE OR REPLACE FUNCTION public.create_partner_earning()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.partner_id IS NOT NULL
     AND NEW.status = 'completed'
     AND (NEW.payment_status IN ('paid','cod','refunded') OR OLD.payment_status IS DISTINCT FROM NEW.payment_status AND NEW.payment_status = 'paid')
     AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.payment_status IS DISTINCT FROM NEW.payment_status)
  THEN
    INSERT INTO public.partner_earnings (partner_id, booking_id, service_name, amount, customer_name, earned_at)
    VALUES (
      NEW.partner_id,
      NEW.id,
      NEW.service_name,
      COALESCE(NEW.price, 0),
      NULL,
      COALESCE(NEW.completed_at, now())
    )
    ON CONFLICT (booking_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.bookings') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_create_partner_earning ON public.bookings';
    EXECUTE 'CREATE TRIGGER trg_create_partner_earning AFTER UPDATE OF status, payment_status ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.create_partner_earning()';
  END IF;
END $$;
