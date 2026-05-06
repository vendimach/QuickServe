-- Direct/personal booking requests sent to a specific favorite partner.
--
-- requested_partner_id: when set, this booking targets one partner. The
--   client filters general partner queues by `requested_partner_id IS NULL`,
--   and the targeted partner sees the booking under "Personal Requests".
-- personal_message: optional note from the customer ("could you do this on
--   Friday afternoon?"). Surfaced verbatim on the partner card.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS requested_partner_id UUID,
  ADD COLUMN IF NOT EXISTS personal_message TEXT;

-- Speeds up the partner-side query for "show me personal requests targeted
-- at me that haven't been picked up yet".
CREATE INDEX IF NOT EXISTS bookings_requested_partner_idx
  ON public.bookings (requested_partner_id)
  WHERE requested_partner_id IS NOT NULL AND status = 'searching';
