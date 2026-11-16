-- Create NHIS Medicines table
CREATE TABLE IF NOT EXISTS nhis_medicines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    dosage_form TEXT,
    strengths TEXT,
    presentation TEXT,
    price DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create NHIS Procedures table
CREATE TABLE IF NOT EXISTS nhis_procedures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    price DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create NHIS HMOs table
CREATE TABLE IF NOT EXISTS nhis_hmos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for faster search
CREATE INDEX IF NOT EXISTS idx_nhis_medicines_code ON nhis_medicines(code);
CREATE INDEX IF NOT EXISTS idx_nhis_medicines_name ON nhis_medicines(name);
CREATE INDEX IF NOT EXISTS idx_nhis_procedures_code ON nhis_procedures(code);
CREATE INDEX IF NOT EXISTS idx_nhis_procedures_name ON nhis_procedures(name);
CREATE INDEX IF NOT EXISTS idx_nhis_hmos_name ON nhis_hmos(name);
