-- Timer, prorated billing, and extension request fields on bookings.
-- All columns are nullable / safe-defaulted so existing rows keep working.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS planned_duration_minutes INT,
  ADD COLUMN IF NOT EXISTS planned_end_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS actual_duration_minutes INT,
  ADD COLUMN IF NOT EXISTS final_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS extension_minutes INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extension_charges NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extension_request_minutes INT,
  ADD COLUMN IF NOT EXISTS extension_request_message TEXT,
  -- 'none' (no request), 'pending' (waiting on partner), 'accepted', 'declined'
  ADD COLUMN IF NOT EXISTS extension_status TEXT NOT NULL DEFAULT 'none';

-- Sanity index — speeds up partner dashboards filtering by their pending requests.
CREATE INDEX IF NOT EXISTS bookings_extension_pending_idx
  ON public.bookings (partner_id)
  WHERE extension_status = 'pending';
