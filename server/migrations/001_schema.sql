-- AdSpot Media — Railway PostgreSQL schema
-- Run once against Railway PostgreSQL: psql $DATABASE_URL -f server/migrations/001_schema.sql

CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    firebase_uid VARCHAR,
    name VARCHAR NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    phone VARCHAR,
    company VARCHAR,
    address TEXT,
    city VARCHAR,
    district VARCHAR,
    total_spent NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    booking_id VARCHAR UNIQUE,
    quotation_number VARCHAR,
    invoice_number VARCHAR,
    customer_id INTEGER REFERENCES customers(id),
    customer_name VARCHAR,
    customer_email VARCHAR,
    customer_phone VARCHAR,
    customer_company VARCHAR,
    customer_address TEXT,
    items JSONB NOT NULL DEFAULT '[]',
    total_amount NUMERIC,
    subtotal_amount NUMERIC,
    promo_code VARCHAR,
    promo_discount NUMERIC DEFAULT 0,
    payment_method VARCHAR,
    payment_status VARCHAR DEFAULT 'pending',
    payment_reference VARCHAR,
    quotation_pdf_url TEXT,
    status VARCHAR DEFAULT 'pending',
    notes TEXT,
    source VARCHAR DEFAULT 'website',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR UNIQUE,
    quotation_number VARCHAR,
    booking_id VARCHAR REFERENCES bookings(booking_id),
    customer_id INTEGER REFERENCES customers(id),
    customer_name VARCHAR,
    customer_email VARCHAR,
    items JSONB NOT NULL DEFAULT '[]',
    subtotal NUMERIC,
    commission NUMERIC DEFAULT 0,
    vat NUMERIC DEFAULT 0,
    service_charge NUMERIC DEFAULT 0,
    total NUMERIC,
    pdf_url TEXT,
    status VARCHAR DEFAULT 'sent',
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotations (
    id SERIAL PRIMARY KEY,
    quotation_number VARCHAR UNIQUE,
    customer_id INTEGER REFERENCES customers(id),
    customer_name VARCHAR,
    customer_email VARCHAR,
    customer_phone VARCHAR,
    customer_company VARCHAR,
    items JSONB NOT NULL DEFAULT '[]',
    subtotal NUMERIC,
    commission NUMERIC DEFAULT 0,
    vat NUMERIC DEFAULT 0,
    service_charge NUMERIC DEFAULT 0,
    promo_code VARCHAR,
    promo_discount NUMERIC DEFAULT 0,
    total NUMERIC,
    notes TEXT,
    pdf_url TEXT,
    payment_method VARCHAR,
    payment_status VARCHAR DEFAULT 'pending',
    status VARCHAR DEFAULT 'pending',
    source VARCHAR DEFAULT 'website',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    booking_id VARCHAR REFERENCES bookings(booking_id),
    quotation_number VARCHAR,
    amount NUMERIC,
    payment_method VARCHAR,
    reference_number VARCHAR,
    status VARCHAR DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS promo_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR UNIQUE NOT NULL,
    discount_type VARCHAR NOT NULL,
    discount_value NUMERIC NOT NULL,
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    endpoint TEXT UNIQUE NOT NULL,
    p256dh TEXT,
    auth TEXT,
    device_label VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_bookings_customer_email ON bookings(customer_email);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotations_customer_email ON quotations(customer_email);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
