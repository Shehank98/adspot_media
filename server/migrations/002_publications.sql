-- Publication groups (Lake House, Wijeya, Upali, etc.)
CREATE TABLE IF NOT EXISTS publication_groups (
    id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    contact_email VARCHAR DEFAULT '',
    active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual newspapers with all ad rates
CREATE TABLE IF NOT EXISTS newspapers (
    id VARCHAR PRIMARY KEY,
    group_id VARCHAR REFERENCES publication_groups(id) ON DELETE CASCADE,
    name VARCHAR NOT NULL,
    language VARCHAR NOT NULL,
    bw_rate NUMERIC DEFAULT 0,
    color_rate NUMERIC DEFAULT 0,
    classified_base NUMERIC DEFAULT 0,
    classified_free_words INTEGER DEFAULT 0,
    classified_extra_rate NUMERIC DEFAULT 0,
    is_sunday_paper BOOLEAN DEFAULT false,
    logo_url TEXT,
    active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_newspapers_group_id ON newspapers(group_id);
CREATE INDEX IF NOT EXISTS idx_newspapers_active ON newspapers(active);
