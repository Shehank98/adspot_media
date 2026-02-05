-- ============================================
-- AdSpot Business Management System
-- Supabase Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CUSTOMERS TABLE
-- ============================================
CREATE TABLE customers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_name ON customers(name);

-- ============================================
-- PUBLICATIONS TABLE
-- ============================================
CREATE TABLE publications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    publication_group VARCHAR(50) NOT NULL, -- lake-house, wijeya, upali, express
    name VARCHAR(255) NOT NULL,
    language VARCHAR(50) NOT NULL, -- english, sinhala, tamil
    box_rate DECIMAL(10, 2) NOT NULL,
    classified_rate DECIMAL(10, 2) NOT NULL,
    color_multiplier DECIMAL(3, 2) DEFAULT 1.5,
    min_words INTEGER DEFAULT 15,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_publications_group ON publications(publication_group);

-- ============================================
-- QUOTATIONS TABLE
-- ============================================
CREATE TABLE quotations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    quotation_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    publication_group VARCHAR(50),
    newspaper_id VARCHAR(100),
    newspaper_name VARCHAR(255),
    ad_type VARCHAR(50) NOT NULL, -- box, classified
    ad_details JSONB, -- Stores width, height, color_option OR text, category, word_count
    publication_date DATE,
    notes TEXT,
    total_amount DECIMAL(12, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, paid, published, cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_quotations_number ON quotations(quotation_number);
CREATE INDEX idx_quotations_status ON quotations(status);
CREATE INDEX idx_quotations_customer ON quotations(customer_id);
CREATE INDEX idx_quotations_date ON quotations(publication_date);

-- ============================================
-- PAYMENTS TABLE
-- ============================================
CREATE TABLE payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    quotation_id UUID REFERENCES quotations(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL, -- card, bank, cash
    reference_number VARCHAR(255),
    stripe_payment_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed, refunded
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payments_quotation ON payments(quotation_id);
CREATE INDEX idx_payments_status ON payments(status);

-- ============================================
-- ADMIN USERS TABLE (optional - use Supabase Auth)
-- ============================================
-- Note: Use Supabase Authentication instead of custom user table
-- This is just for reference if you need additional user data

CREATE TABLE admin_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users (admin)
CREATE POLICY "Admins can view all customers" ON customers
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert customers" ON customers
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins can update customers" ON customers
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can view all publications" ON publications
    FOR SELECT USING (true); -- Public read

CREATE POLICY "Admins can manage publications" ON publications
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can view all quotations" ON quotations
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can insert quotations" ON quotations
    FOR INSERT WITH CHECK (true); -- Allow public booking

CREATE POLICY "Admins can update quotations" ON quotations
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can view all payments" ON payments
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can insert payments" ON payments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update payments" ON payments
    FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_publications_updated_at
    BEFORE UPDATE ON publications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_quotations_updated_at
    BEFORE UPDATE ON quotations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- SEED DATA - Default Publications
-- ============================================

INSERT INTO publications (publication_group, name, language, box_rate, classified_rate, color_multiplier) VALUES
-- Lake House
('lake-house', 'Daily News', 'english', 500.00, 25.00, 1.50),
('lake-house', 'Sunday Observer', 'english', 600.00, 30.00, 1.50),
('lake-house', 'Dinamina', 'sinhala', 450.00, 20.00, 1.40),
('lake-house', 'Silumina', 'sinhala', 550.00, 25.00, 1.40),
('lake-house', 'Thinakaran', 'tamil', 400.00, 18.00, 1.40),

-- Wijeya
('wijeya', 'Sunday Times', 'english', 700.00, 35.00, 1.60),
('wijeya', 'Daily Mirror', 'english', 550.00, 28.00, 1.50),
('wijeya', 'Lankadeepa', 'sinhala', 600.00, 25.00, 1.50),
('wijeya', 'Divaina', 'sinhala', 500.00, 22.00, 1.40),

-- Upali
('upali', 'The Island', 'english', 550.00, 28.00, 1.50),
('upali', 'Divaina', 'sinhala', 480.00, 22.00, 1.40),

-- Express
('express', 'Virakesari', 'tamil', 450.00, 20.00, 1.40),
('express', 'Sudar Oli', 'tamil', 400.00, 18.00, 1.30);

-- ============================================
-- VIEWS FOR REPORTING
-- ============================================

-- Daily revenue summary
CREATE VIEW daily_revenue AS
SELECT 
    DATE(p.created_at) as date,
    COUNT(*) as payment_count,
    SUM(p.amount) as total_revenue
FROM payments p
WHERE p.status = 'completed'
GROUP BY DATE(p.created_at)
ORDER BY date DESC;

-- Customer summary
CREATE VIEW customer_summary AS
SELECT 
    c.id,
    c.name,
    c.email,
    COUNT(q.id) as total_orders,
    COALESCE(SUM(q.total_amount), 0) as total_spent
FROM customers c
LEFT JOIN quotations q ON c.id = q.customer_id
GROUP BY c.id, c.name, c.email
ORDER BY total_spent DESC;

-- Publication performance
CREATE VIEW publication_performance AS
SELECT 
    q.newspaper_name,
    q.ad_type,
    COUNT(*) as ad_count,
    SUM(q.total_amount) as total_revenue
FROM quotations q
WHERE q.status IN ('paid', 'published')
GROUP BY q.newspaper_name, q.ad_type
ORDER BY total_revenue DESC;
