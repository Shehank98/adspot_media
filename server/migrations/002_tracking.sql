-- 002_tracking.sql
-- Adds booking workflow tracking columns and design_requests table

ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS artwork_status VARCHAR DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS artwork_received_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS artwork_approved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS sent_to_publication_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS proof_url TEXT,
    ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS design_requests (
    id SERIAL PRIMARY KEY,
    booking_id VARCHAR REFERENCES bookings(booking_id),
    customer_name VARCHAR,
    customer_email VARCHAR,
    brief JSONB NOT NULL DEFAULT '{}',
    fee NUMERIC DEFAULT 2500,
    status VARCHAR DEFAULT 'pending',
    delivery_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
