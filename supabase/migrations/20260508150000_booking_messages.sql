-- Ephemeral per-booking chat messages.
-- Messages are automatically purged when the booking reaches a terminal state
-- (completed / cancelled / refunded) via the trigger below.

CREATE TABLE booking_messages (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  uuid        NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_role text        NOT NULL CHECK (sender_role IN ('customer', 'partner')),
  body        text        NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 2000),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Fast per-booking chronological fetch
CREATE INDEX booking_messages_booking_created_idx
  ON booking_messages (booking_id, created_at ASC);

-- ── Row-Level Security ────────────────────────────────────────────────────────
ALTER TABLE booking_messages ENABLE ROW LEVEL SECURITY;

-- Only the customer and the assigned partner of a booking can read its messages.
CREATE POLICY "participants can read"
  ON booking_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_messages.booking_id
        AND (b.user_id = auth.uid() OR b.partner_user_id = auth.uid())
    )
  );

-- A participant can insert a message only while the booking is active.
CREATE POLICY "participants can send while active"
  ON booking_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_messages.booking_id
        AND (b.user_id = auth.uid() OR b.partner_user_id = auth.uid())
        AND b.status IN ('confirmed', 'in-progress')
    )
  );

-- ── Realtime ─────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE booking_messages;

-- ── Cleanup trigger ───────────────────────────────────────────────────────────
-- Delete all messages for a booking the moment it reaches a terminal status.
-- This keeps the table from accumulating historical chat data indefinitely.
CREATE OR REPLACE FUNCTION _delete_booking_messages_on_terminal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status IN ('completed', 'cancelled', 'refunded')
     AND OLD.status NOT IN ('completed', 'cancelled', 'refunded') THEN
    DELETE FROM booking_messages WHERE booking_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER booking_messages_cleanup
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION _delete_booking_messages_on_terminal();
