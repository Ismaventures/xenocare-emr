-- =============================================================================
-- NDC Medical Centre EMR - RECONCILE BILLING SCHEMA (ROBUST)
-- Migration: 038_reconcile_billing.sql
-- Description: Creates billing tables if missing, or migrates them if they exist in old format.
-- =============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. INVOICES TABLE
-- =====================================================

DO $$
BEGIN
    -- 1. Create table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
        CREATE TABLE invoices (
            invoice_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            invoice_number VARCHAR(50) UNIQUE NOT NULL,
            patient_id VARCHAR(50) REFERENCES patients(patient_id) ON DELETE CASCADE NOT NULL,
            consultation_id UUID REFERENCES consultations(consultation_id) ON DELETE SET NULL,
            
            subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
            discount_total DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
            tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
            total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
            amount_paid DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
            balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
            
            status VARCHAR(50) DEFAULT 'Pending',
            due_date DATE,
            notes TEXT,
            
            created_by VARCHAR(50) REFERENCES staff(staff_id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    ELSE
        -- 2. Migrate existing table
        
        -- Rename PK id -> invoice_id
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'id') THEN
            ALTER TABLE invoices RENAME COLUMN id TO invoice_id;
        END IF;

        -- Fix patient_id (UUID -> VARCHAR)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'patient_id' AND data_type = 'uuid') THEN
            ALTER TABLE invoices ADD COLUMN IF NOT EXISTS patient_id_new VARCHAR(50);
            BEGIN
                UPDATE invoices i SET patient_id_new = p.patient_id FROM patients p WHERE i.patient_id = p.id;
            EXCEPTION WHEN OTHERS THEN NULL; END;
            
            ALTER TABLE invoices DROP COLUMN patient_id CASCADE;
            ALTER TABLE invoices RENAME COLUMN patient_id_new TO patient_id;
            ALTER TABLE invoices ADD CONSTRAINT fk_invoices_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE;
        END IF;

        -- Fix created_by (UUID -> VARCHAR)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'created_by' AND data_type = 'uuid') THEN
            ALTER TABLE invoices ADD COLUMN IF NOT EXISTS created_by_new VARCHAR(50);
            BEGIN
                UPDATE invoices i SET created_by_new = s.staff_id FROM staff s WHERE i.created_by = s.id;
            EXCEPTION WHEN OTHERS THEN NULL; END;
            
            ALTER TABLE invoices DROP COLUMN created_by CASCADE;
            ALTER TABLE invoices RENAME COLUMN created_by_new TO created_by;
            ALTER TABLE invoices ADD CONSTRAINT fk_invoices_created_by FOREIGN KEY (created_by) REFERENCES staff(staff_id);
        END IF;

        -- Fix status type
        ALTER TABLE invoices ALTER COLUMN status TYPE VARCHAR(50);

        -- Fix consultation_id FK
        ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_consultation_id_fkey;
        ALTER TABLE invoices ADD CONSTRAINT fk_invoices_consultation FOREIGN KEY (consultation_id) REFERENCES consultations(consultation_id) ON DELETE SET NULL;
    END IF;
END $$;


-- =====================================================
-- 2. INVOICE ITEMS TABLE
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoice_items') THEN
        CREATE TABLE invoice_items (
            item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            invoice_id UUID REFERENCES invoices(invoice_id) ON DELETE CASCADE NOT NULL,
            
            description TEXT NOT NULL,
            category VARCHAR(50) NOT NULL DEFAULT 'Other',
            quantity INTEGER NOT NULL DEFAULT 1,
            unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
            
            discount_percent DECIMAL(5, 2) DEFAULT 0.00,
            discount_amount DECIMAL(10, 2) DEFAULT 0.00,
            total DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
            
            reference_id UUID,
            reference_type VARCHAR(50),
            
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    ELSE
        -- Rename PK id -> item_id
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice_items' AND column_name = 'id') THEN
            ALTER TABLE invoice_items RENAME COLUMN id TO item_id;
        END IF;

        -- Ensure invoice_id exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice_items' AND column_name = 'invoice_id') THEN
            ALTER TABLE invoice_items ADD COLUMN invoice_id UUID;
        END IF;

        -- Fix invoice_id FK
        ALTER TABLE invoice_items DROP CONSTRAINT IF EXISTS invoice_items_invoice_id_fkey;
        ALTER TABLE invoice_items ADD CONSTRAINT fk_invoice_items_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) ON DELETE CASCADE;

        -- Fix category type
        ALTER TABLE invoice_items ALTER COLUMN category TYPE VARCHAR(50);
    END IF;
END $$;


-- =====================================================
-- 3. PAYMENTS TABLE
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
        CREATE TABLE payments (
            payment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            receipt_number VARCHAR(50) UNIQUE NOT NULL,
            invoice_id UUID REFERENCES invoices(invoice_id),
            patient_id VARCHAR(50) REFERENCES patients(patient_id),
            
            amount DECIMAL(10, 2) NOT NULL,
            payment_method payment_method NOT NULL,
            transaction_reference VARCHAR(100),
            
            received_by VARCHAR(50) REFERENCES staff(staff_id),
            payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            notes TEXT,
            
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    ELSE
        -- Rename PK id -> payment_id
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'id') THEN
            ALTER TABLE payments RENAME COLUMN id TO payment_id;
        END IF;

        -- Ensure invoice_id exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'invoice_id') THEN
            ALTER TABLE payments ADD COLUMN invoice_id UUID;
        END IF;

        -- Fix invoice_id FK
        ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_invoice_id_fkey;
        ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_billing_order_id_fkey;
        ALTER TABLE payments ADD CONSTRAINT fk_payments_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id);

        -- Fix patient_id (UUID -> VARCHAR)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'patient_id' AND data_type = 'uuid') THEN
            ALTER TABLE payments ADD COLUMN IF NOT EXISTS patient_id_new VARCHAR(50);
            BEGIN
                UPDATE payments pay SET patient_id_new = p.patient_id FROM patients p WHERE pay.patient_id = p.id;
            EXCEPTION WHEN OTHERS THEN NULL; END;
            
            ALTER TABLE payments DROP COLUMN patient_id CASCADE;
            ALTER TABLE payments RENAME COLUMN patient_id_new TO patient_id;
            ALTER TABLE payments ADD CONSTRAINT fk_payments_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id);
        END IF;

        -- Fix received_by (cashier_id -> received_by)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'cashier_id') THEN
            ALTER TABLE payments ADD COLUMN IF NOT EXISTS received_by VARCHAR(50);
            BEGIN
                UPDATE payments p SET received_by = s.staff_id FROM staff s WHERE p.cashier_id = s.id;
            EXCEPTION WHEN OTHERS THEN NULL; END;
            
            ALTER TABLE payments DROP COLUMN cashier_id CASCADE;
            ALTER TABLE payments ADD CONSTRAINT fk_payments_received_by FOREIGN KEY (received_by) REFERENCES staff(staff_id);
        END IF;

        -- Add notes
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS notes TEXT;
    END IF;
END $$;


-- =====================================================
-- 4. RECEIPTS TABLE
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'receipts') THEN
        CREATE TABLE receipts (
            receipt_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            receipt_number VARCHAR(50) NOT NULL UNIQUE,
            billing_order_id UUID, -- Optional legacy
            invoice_id UUID REFERENCES invoices(invoice_id) ON DELETE SET NULL,
            patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
            visit_id VARCHAR(50) REFERENCES visits(visit_id) ON DELETE SET NULL,
            
            amount_paid DECIMAL(12,2) NOT NULL,
            payment_method payment_method NOT NULL,
            reference_number VARCHAR(100),
            
            issued_by VARCHAR(50) REFERENCES staff(staff_id),
            issue_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    ELSE
        -- Rename PK id -> receipt_id
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receipts' AND column_name = 'id') THEN
            ALTER TABLE receipts RENAME COLUMN id TO receipt_id;
        END IF;

        -- Ensure invoice_id exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receipts' AND column_name = 'invoice_id') THEN
            ALTER TABLE receipts ADD COLUMN invoice_id UUID;
        END IF;

        -- Fix invoice_id FK
        ALTER TABLE receipts DROP CONSTRAINT IF EXISTS receipts_invoice_id_fkey;
        ALTER TABLE receipts ADD CONSTRAINT fk_receipts_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) ON DELETE SET NULL;

        -- Fix patient_id (UUID -> VARCHAR)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receipts' AND column_name = 'patient_id' AND data_type = 'uuid') THEN
            ALTER TABLE receipts ADD COLUMN IF NOT EXISTS patient_id_new VARCHAR(50);
            BEGIN
                UPDATE receipts r SET patient_id_new = p.patient_id FROM patients p WHERE r.patient_id = p.id;
            EXCEPTION WHEN OTHERS THEN NULL; END;
            
            ALTER TABLE receipts DROP COLUMN patient_id CASCADE;
            ALTER TABLE receipts RENAME COLUMN patient_id_new TO patient_id;
            ALTER TABLE receipts ADD CONSTRAINT fk_receipts_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE;
        END IF;

        -- Fix visit_id (UUID -> VARCHAR)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receipts' AND column_name = 'visit_id' AND data_type = 'uuid') THEN
            ALTER TABLE receipts ADD COLUMN IF NOT EXISTS visit_id_new VARCHAR(50);
            BEGIN
                UPDATE receipts r SET visit_id_new = v.visit_id FROM visits v WHERE r.visit_id = v.id;
            EXCEPTION WHEN OTHERS THEN NULL; END;
            
            ALTER TABLE receipts DROP COLUMN visit_id CASCADE;
            ALTER TABLE receipts RENAME COLUMN visit_id_new TO visit_id;
            ALTER TABLE receipts ADD CONSTRAINT fk_receipts_visit FOREIGN KEY (visit_id) REFERENCES visits(visit_id) ON DELETE SET NULL;
        END IF;

        -- Fix issued_by (UUID -> VARCHAR)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receipts' AND column_name = 'issued_by' AND data_type = 'uuid') THEN
            ALTER TABLE receipts ADD COLUMN IF NOT EXISTS issued_by_new VARCHAR(50);
            BEGIN
                UPDATE receipts r SET issued_by_new = s.staff_id FROM staff s WHERE r.issued_by = s.id;
            EXCEPTION WHEN OTHERS THEN NULL; END;
            
            ALTER TABLE receipts DROP COLUMN issued_by CASCADE;
            ALTER TABLE receipts RENAME COLUMN issued_by_new TO issued_by;
            ALTER TABLE receipts ADD CONSTRAINT fk_receipts_issued_by FOREIGN KEY (issued_by) REFERENCES staff(staff_id);
        END IF;
    END IF;
END $$;


-- =====================================================
-- 5. PRICE LIST TABLE
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'price_list') THEN
        CREATE TABLE price_list (
            price_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            item_code VARCHAR(50) UNIQUE NOT NULL,
            item_name VARCHAR(255) NOT NULL,
            category VARCHAR(50) NOT NULL,
            unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    ELSE
        -- Rename PK id -> price_id
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'price_list' AND column_name = 'id') THEN
            ALTER TABLE price_list RENAME COLUMN id TO price_id;
        END IF;

        -- Fix category type
        ALTER TABLE price_list ALTER COLUMN category TYPE VARCHAR(50);
    END IF;
END $$;
