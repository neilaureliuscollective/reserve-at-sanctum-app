-- Generated with Supabase CLI migration new in isolated Vercel Sandbox.
-- Additive to the existing booking engine. Apply only after baseline/restore review.
ALTER TABLE reserve_appointments ADD COLUMN IF NOT EXISTS arrived_at timestamptz;
ALTER TABLE reserve_appointments ADD COLUMN IF NOT EXISTS no_show_at timestamptz;
ALTER TABLE reserve_appointments DROP CONSTRAINT IF EXISTS reserve_appointments_status_check;
ALTER TABLE reserve_appointments ADD CONSTRAINT reserve_appointments_status_check CHECK(status IN ('confirmed','cancelled','completed','no_show'));
ALTER TABLE reserve_appointments DROP CONSTRAINT IF EXISTS reserve_appointment_attendance_consistent;
ALTER TABLE reserve_appointments ADD CONSTRAINT reserve_appointment_attendance_consistent CHECK((status='no_show')=(no_show_at IS NOT NULL) AND NOT (status='no_show' AND arrived_at IS NOT NULL));
ALTER TABLE reserve_booking_messages ADD COLUMN IF NOT EXISTS provider_message_id text;
ALTER TABLE reserve_booking_messages ADD COLUMN IF NOT EXISTS accepted_at timestamptz;
ALTER TABLE reserve_booking_messages ADD COLUMN IF NOT EXISTS recipient_email text;
ALTER TABLE reserve_booking_messages ADD COLUMN IF NOT EXISTS delivery_handled_at timestamptz;
ALTER TABLE reserve_booking_messages ADD COLUMN IF NOT EXISTS delivery_handled_by text REFERENCES reserve_users(id);
ALTER TABLE reserve_booking_messages ADD COLUMN IF NOT EXISTS delivery_status text CHECK(delivery_status IN ('accepted','delayed','delivered','bounced','complained','failed','suppressed'));
ALTER TABLE reserve_booking_messages ADD COLUMN IF NOT EXISTS delivery_updated_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS reserve_message_provider_reference ON reserve_booking_messages(provider_message_id) WHERE provider_message_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS reserve_booking_receipts (
 id text PRIMARY KEY, provider_message_id text NOT NULL,
 message_id text REFERENCES reserve_booking_messages(id) ON DELETE SET NULL,
 status text NOT NULL CHECK(status IN ('accepted','delayed','delivered','bounced','complained','failed','suppressed')),
 occurred_at timestamptz NOT NULL, received_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE reserve_booking_receipts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS reserve_receipt_provider_time ON reserve_booking_receipts(provider_message_id,occurred_at);
-- No browser policies or grants. Runtime role grants must be reviewed in staging.
CREATE INDEX IF NOT EXISTS reserve_receipt_pending ON reserve_booking_receipts(provider_message_id) WHERE message_id IS NULL;
CREATE INDEX IF NOT EXISTS reserve_message_suppressed_recipient ON reserve_booking_messages(lower(recipient_email)) WHERE delivery_status IN ('bounced','complained','suppressed');
