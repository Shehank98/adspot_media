-- Settings table for admin-configurable values
CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO settings (key, value) VALUES ('design_fee', '3000')                ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('box_commission_pct', '5')           ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('classified_commission_pct', '5')    ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('vat_pct', '18')                     ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('classified_service_charge', '50')   ON CONFLICT (key) DO NOTHING;

-- Add design request and receipt columns to bookings
ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS design_requested BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS design_fee NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS receipt_url TEXT,
    ADD COLUMN IF NOT EXISTS receipt_uploaded_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS receipt_status VARCHAR DEFAULT 'none';
