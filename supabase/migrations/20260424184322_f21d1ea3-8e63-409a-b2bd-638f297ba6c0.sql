
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS bio text;

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

CREATE POLICY "addr_select_own" ON public.saved_addresses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "addr_insert_own" ON public.saved_addresses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "addr_update_own" ON public.saved_addresses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "addr_delete_own" ON public.saved_addresses FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER addr_set_updated BEFORE UPDATE ON public.saved_addresses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  partner_id uuid,
  service_id text NOT NULL,
  service_name text NOT NULL,
  category_id text NOT NULL,
  booking_type text NOT NULL,
  status text NOT NULL DEFAULT 'searching',
  scheduled_at timestamptz,
  address text NOT NULL,
  professional_name text,
  professional_id text,
  price numeric NOT NULL DEFAULT 0,
  duration text,
  payment_status text NOT NULL DEFAULT 'pending',
  payment_method text,
  refund_status text,
  rating int,
  rating_comment text,
  preferences jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  arrived_at timestamptz,
  completed_at timestamptz
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bookings_select_own" ON public.bookings FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = partner_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "bookings_insert_own" ON public.bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bookings_update_own" ON public.bookings FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = partner_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "bookings_delete_own" ON public.bookings FOR DELETE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER bookings_set_updated BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS bookings_user_idx ON public.bookings(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS bookings_partner_idx ON public.bookings(partner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  method text NOT NULL DEFAULT 'card',
  status text NOT NULL DEFAULT 'pending',
  transaction_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pay_select_own" ON public.payments FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "pay_insert_own" ON public.payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pay_update_own" ON public.payments FOR UPDATE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER pay_set_updated BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE POLICY "profiles_admin_select" ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "roles_admin_select" ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
