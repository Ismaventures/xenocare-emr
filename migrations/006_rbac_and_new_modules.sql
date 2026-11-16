-- =============================================================================
-- NDC Medical Centre EMR SYSTEM - RBAC & NEW MODULES MIGRATION
-- Version: 2.1
-- Description: Add new roles, inventory management, configurations, and enhanced RBAC
-- =============================================================================

-- =============================================================================
-- UPDATE USER ROLE ENUM - Add new roles
-- =============================================================================

-- Add new role values to the enum
ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'cashier';
ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'customer_service';
ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'inventory_manager';
ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'config_admin';

-- =============================================================================
-- QUEUE LOCATION ENUM - Add Cashier location
-- =============================================================================

ALTER TYPE queue_location_enum ADD VALUE IF NOT EXISTS 'Cashier';
ALTER TYPE queue_location_enum ADD VALUE IF NOT EXISTS 'CustomerService';

-- Add to queue_sequence
INSERT INTO queue_sequence (location, current_number) VALUES
    ('Cashier', 0),
    ('CustomerService', 0)
ON CONFLICT (location) DO NOTHING;

-- =============================================================================
-- INVENTORY MODULE TABLES
-- =============================================================================

-- Inventory Categories
CREATE TABLE IF NOT EXISTS inventory_categories (
    category_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    parent_category_id UUID REFERENCES inventory_categories(category_id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- General Inventory Items (non-drug items)
CREATE TABLE IF NOT EXISTS inventory_items (
    item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_code TEXT UNIQUE NOT NULL,
    item_name TEXT NOT NULL,
    description TEXT,
    category_id UUID REFERENCES inventory_categories(category_id),
    -- Stock information
    quantity_in_stock INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 10,
    unit_of_measure TEXT DEFAULT 'units',
    -- Pricing
    unit_cost DECIMAL(10, 2) DEFAULT 0.00,
    selling_price DECIMAL(10, 2) DEFAULT 0.00,
    -- Supplier info
    supplier TEXT,
    batch_number TEXT,
    expiry_date DATE,
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_consumable BOOLEAN DEFAULT TRUE,
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_name ON inventory_items(item_name);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_stock ON inventory_items(quantity_in_stock);

-- Inventory Stock Movements (comprehensive audit trail)
CREATE TABLE IF NOT EXISTS inventory_stock_movements (
    movement_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID REFERENCES inventory_items(item_id) ON DELETE CASCADE,
    drug_id UUID REFERENCES drug_catalogue(drug_id) ON DELETE CASCADE,
    movement_type TEXT NOT NULL, -- 'PURCHASE', 'SALE', 'ADJUSTMENT', 'TRANSFER', 'EXPIRED', 'DAMAGED', 'RETURN'
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(10, 2),
    total_cost DECIMAL(10, 2),
    -- Reference to source document
    reference_type TEXT, -- 'purchase_order', 'prescription', 'adjustment', 'transfer'
    reference_id UUID,
    -- Stock levels
    previous_quantity INTEGER,
    new_quantity INTEGER,
    -- Additional info
    batch_number TEXT,
    expiry_date DATE,
    notes TEXT,
    -- Audit
    performed_by UUID REFERENCES staff(staff_id),
    approved_by UUID REFERENCES staff(staff_id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON inventory_stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_drug ON inventory_stock_movements(drug_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON inventory_stock_movements(created_at);

-- Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
    po_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number TEXT UNIQUE NOT NULL,
    supplier_name TEXT NOT NULL,
    supplier_contact TEXT,
    supplier_address TEXT,
    -- Order details
    order_date TIMESTAMPTZ DEFAULT NOW(),
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    -- Financial
    subtotal DECIMAL(12, 2) DEFAULT 0.00,
    tax_amount DECIMAL(10, 2) DEFAULT 0.00,
    discount_amount DECIMAL(10, 2) DEFAULT 0.00,
    total_amount DECIMAL(12, 2) DEFAULT 0.00,
    -- Status
    status TEXT DEFAULT 'Draft', -- 'Draft', 'Submitted', 'Approved', 'Ordered', 'Partial', 'Received', 'Cancelled'
    -- Audit
    created_by UUID REFERENCES staff(staff_id),
    approved_by UUID REFERENCES staff(staff_id),
    received_by UUID REFERENCES staff(staff_id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchase Order Items
CREATE TABLE IF NOT EXISTS purchase_order_items (
    poi_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_id UUID REFERENCES purchase_orders(po_id) ON DELETE CASCADE NOT NULL,
    -- Item reference (either inventory item or drug)
    item_id UUID REFERENCES inventory_items(item_id),
    drug_id UUID REFERENCES drug_catalogue(drug_id),
    item_type TEXT NOT NULL, -- 'inventory' or 'drug'
    -- Order details
    quantity_ordered INTEGER NOT NULL,
    quantity_received INTEGER DEFAULT 0,
    unit_cost DECIMAL(10, 2) NOT NULL,
    total_cost DECIMAL(12, 2) NOT NULL,
    -- Status
    status TEXT DEFAULT 'Pending', -- 'Pending', 'Partial', 'Received', 'Cancelled'
    batch_number TEXT,
    expiry_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- CONFIGURATIONS MODULE TABLES
-- =============================================================================

-- System Configuration Categories
CREATE TABLE IF NOT EXISTS config_categories (
    category_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- System Configurations
CREATE TABLE IF NOT EXISTS system_configurations (
    config_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES config_categories(category_id),
    config_key TEXT NOT NULL UNIQUE,
    config_value JSONB NOT NULL,
    config_type TEXT NOT NULL, -- 'string', 'number', 'boolean', 'json', 'array'
    display_name TEXT NOT NULL,
    description TEXT,
    is_editable BOOLEAN DEFAULT TRUE,
    requires_restart BOOLEAN DEFAULT FALSE,
    -- Validation
    validation_rules JSONB,
    -- Audit
    last_modified_by UUID REFERENCES staff(staff_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configuration Audit Log (separate from main audit for config changes)
CREATE TABLE IF NOT EXISTS config_audit_log (
    audit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_id UUID REFERENCES system_configurations(config_id),
    config_key TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    change_reason TEXT,
    changed_by UUID REFERENCES staff(staff_id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- CUSTOMER SERVICE MODULE TABLES
-- =============================================================================

-- Complaints/Feedback
CREATE TABLE IF NOT EXISTS customer_feedback (
    feedback_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(patient_id) ON DELETE SET NULL,
    -- Feedback details
    feedback_type TEXT NOT NULL, -- 'Complaint', 'Suggestion', 'Compliment', 'Inquiry'
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    -- Contact info (for non-patient feedback)
    contact_name TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    -- Resolution
    status TEXT DEFAULT 'Open', -- 'Open', 'In Progress', 'Resolved', 'Closed', 'Escalated'
    priority TEXT DEFAULT 'Normal', -- 'Low', 'Normal', 'High', 'Urgent'
    assigned_to UUID REFERENCES staff(staff_id),
    resolution_notes TEXT,
    resolution_date TIMESTAMPTZ,
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_patient ON customer_feedback(patient_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON customer_feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_date ON customer_feedback(created_at);

-- Patient Appointments (managed by customer service)
CREATE TABLE IF NOT EXISTS appointments (
    appointment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(patient_id) ON DELETE CASCADE NOT NULL,
    -- Appointment details
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    appointment_type TEXT NOT NULL, -- 'Consultation', 'Follow-up', 'Lab', 'Radiology', 'Procedure'
    -- Department/Doctor
    department TEXT,
    doctor_id UUID REFERENCES staff(staff_id),
    -- Status
    status TEXT DEFAULT 'Scheduled', -- 'Scheduled', 'Confirmed', 'Checked-in', 'In Progress', 'Completed', 'Cancelled', 'No Show'
    -- Notes
    reason TEXT,
    notes TEXT,
    -- Reminders
    reminder_sent BOOLEAN DEFAULT FALSE,
    reminder_date TIMESTAMPTZ,
    -- Audit
    booked_by UUID REFERENCES staff(staff_id),
    confirmed_by UUID REFERENCES staff(staff_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- =============================================================================
-- CASHIER MODULE TABLES
-- =============================================================================

-- Cash Register Sessions
CREATE TABLE IF NOT EXISTS cash_register_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cashier_id UUID REFERENCES staff(staff_id) NOT NULL,
    -- Session details
    register_number TEXT,
    opening_balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    closing_balance DECIMAL(12, 2),
    -- Calculated totals
    total_cash_received DECIMAL(12, 2) DEFAULT 0.00,
    total_pos_received DECIMAL(12, 2) DEFAULT 0.00,
    total_refunds DECIMAL(12, 2) DEFAULT 0.00,
    expected_balance DECIMAL(12, 2),
    difference DECIMAL(12, 2),
    -- Status
    status TEXT DEFAULT 'Open', -- 'Open', 'Closed', 'Reconciled'
    -- Timestamps
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    reconciled_at TIMESTAMPTZ,
    reconciled_by UUID REFERENCES staff(staff_id),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_cash_sessions_cashier ON cash_register_sessions(cashier_id);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_status ON cash_register_sessions(status);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_date ON cash_register_sessions(opened_at);

-- Payment Transactions (detailed payment records for cashier)
CREATE TABLE IF NOT EXISTS payment_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES cash_register_sessions(session_id),
    billing_id UUID REFERENCES billing(billing_id),
    patient_id UUID REFERENCES patients(patient_id) ON DELETE SET NULL,
    -- Transaction details
    transaction_type TEXT NOT NULL, -- 'Payment', 'Refund', 'Adjustment'
    amount DECIMAL(12, 2) NOT NULL,
    payment_method payment_method_enum NOT NULL,
    -- Receipt
    receipt_number TEXT UNIQUE NOT NULL,
    -- Reference
    reference_number TEXT, -- POS reference, cheque number, etc.
    -- Status
    status TEXT DEFAULT 'Completed', -- 'Completed', 'Void', 'Refunded'
    void_reason TEXT,
    voided_by UUID REFERENCES staff(staff_id),
    voided_at TIMESTAMPTZ,
    -- Audit
    processed_by UUID REFERENCES staff(staff_id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_trans_session ON payment_transactions(session_id);
CREATE INDEX IF NOT EXISTS idx_payment_trans_patient ON payment_transactions(patient_id);
CREATE INDEX IF NOT EXISTS idx_payment_trans_date ON payment_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_trans_receipt ON payment_transactions(receipt_number);

-- =============================================================================
-- MEDICAL REPORTS MODULE TABLES
-- =============================================================================

-- Medical Reports (Generated medical documents)
CREATE TABLE IF NOT EXISTS medical_reports (
    report_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(patient_id) ON DELETE CASCADE NOT NULL,
    visit_id UUID REFERENCES visits(visit_id) ON DELETE SET NULL,
    -- Report details
    report_type TEXT NOT NULL, -- 'Medical Certificate', 'Sick Leave', 'Fitness Report', 'Referral Letter', 'Discharge Summary', 'Death Certificate', 'Medical Report'
    report_title TEXT NOT NULL,
    report_content TEXT NOT NULL,
    -- Validity
    valid_from DATE,
    valid_to DATE,
    -- Status
    status TEXT DEFAULT 'Draft', -- 'Draft', 'Pending Approval', 'Approved', 'Issued', 'Revoked'
    -- Authorization
    created_by UUID REFERENCES staff(staff_id) NOT NULL,
    approved_by UUID REFERENCES staff(staff_id),
    approved_at TIMESTAMPTZ,
    issued_at TIMESTAMPTZ,
    -- Document
    document_url TEXT,
    document_number TEXT UNIQUE,
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medical_reports_patient ON medical_reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_reports_type ON medical_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_medical_reports_status ON medical_reports(status);
CREATE INDEX IF NOT EXISTS idx_medical_reports_date ON medical_reports(created_at);

-- Medical Report Templates
CREATE TABLE IF NOT EXISTS report_templates (
    template_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_type TEXT NOT NULL,
    template_name TEXT NOT NULL,
    template_content TEXT NOT NULL,
    placeholders JSONB, -- List of placeholders in the template
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES staff(staff_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- PERMISSIONS TABLE - Granular permissions
-- =============================================================================

CREATE TABLE IF NOT EXISTS permissions (
    permission_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    permission_name TEXT NOT NULL UNIQUE,
    description TEXT,
    module TEXT NOT NULL,
    action TEXT NOT NULL, -- 'create', 'read', 'update', 'delete', 'export', 'approve'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Role Permissions Mapping
CREATE TABLE IF NOT EXISTS role_permissions (
    role_permission_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role user_role_enum NOT NULL,
    permission_id UUID REFERENCES permissions(permission_id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role, permission_id)
);

-- =============================================================================
-- SEED PERMISSIONS DATA
-- =============================================================================

-- Insert module permissions
INSERT INTO permissions (permission_name, description, module, action) VALUES
    -- Patient Records
    ('patient.create', 'Create patient records', 'patient_records', 'create'),
    ('patient.read', 'View patient records', 'patient_records', 'read'),
    ('patient.update', 'Update patient records', 'patient_records', 'update'),
    ('patient.delete', 'Delete patient records', 'patient_records', 'delete'),
    ('patient.export', 'Export patient data', 'patient_records', 'export'),
    -- OPD/Consultation
    ('opd.create', 'Create consultations', 'opd', 'create'),
    ('opd.read', 'View consultations', 'opd', 'read'),
    ('opd.update', 'Update consultations', 'opd', 'update'),
    ('opd.delete', 'Delete consultations', 'opd', 'delete'),
    -- Pharmacy
    ('pharmacy.create', 'Create prescriptions', 'pharmacy', 'create'),
    ('pharmacy.read', 'View prescriptions', 'pharmacy', 'read'),
    ('pharmacy.update', 'Update prescriptions', 'pharmacy', 'update'),
    ('pharmacy.dispense', 'Dispense medications', 'pharmacy', 'update'),
    -- Laboratory
    ('lab.create', 'Create lab requests', 'laboratory', 'create'),
    ('lab.read', 'View lab requests', 'laboratory', 'read'),
    ('lab.update', 'Update lab results', 'laboratory', 'update'),
    ('lab.approve', 'Approve lab results', 'laboratory', 'approve'),
    -- Imaging/Radiology
    ('imaging.create', 'Create imaging requests', 'imaging', 'create'),
    ('imaging.read', 'View imaging requests', 'imaging', 'read'),
    ('imaging.update', 'Update imaging results', 'imaging', 'update'),
    ('imaging.approve', 'Approve imaging results', 'imaging', 'approve'),
    -- Nursing Station
    ('nursing.create', 'Create nursing notes', 'nursing', 'create'),
    ('nursing.read', 'View nursing notes', 'nursing', 'read'),
    ('nursing.update', 'Update nursing notes', 'nursing', 'update'),
    -- Medical Reports
    ('reports.create', 'Create medical reports', 'medical_reports', 'create'),
    ('reports.read', 'View medical reports', 'medical_reports', 'read'),
    ('reports.update', 'Update medical reports', 'medical_reports', 'update'),
    ('reports.approve', 'Approve medical reports', 'medical_reports', 'approve'),
    -- Reports/Analytics
    ('analytics.read', 'View analytics', 'analytics', 'read'),
    ('analytics.export', 'Export analytics', 'analytics', 'export'),
    -- Customer Service
    ('cs.create', 'Create feedback/appointments', 'customer_service', 'create'),
    ('cs.read', 'View feedback/appointments', 'customer_service', 'read'),
    ('cs.update', 'Update feedback/appointments', 'customer_service', 'update'),
    -- Finance/Billing
    ('finance.create', 'Create invoices', 'finance', 'create'),
    ('finance.read', 'View invoices', 'finance', 'read'),
    ('finance.update', 'Update invoices', 'finance', 'update'),
    ('finance.approve', 'Approve refunds', 'finance', 'approve'),
    -- Cashier
    ('cashier.create', 'Process payments', 'cashier', 'create'),
    ('cashier.read', 'View transactions', 'cashier', 'read'),
    ('cashier.void', 'Void transactions', 'cashier', 'update'),
    ('cashier.reconcile', 'Reconcile register', 'cashier', 'approve'),
    -- Inventory
    ('inventory.create', 'Add inventory items', 'inventory', 'create'),
    ('inventory.read', 'View inventory', 'inventory', 'read'),
    ('inventory.update', 'Update inventory', 'inventory', 'update'),
    ('inventory.delete', 'Delete inventory items', 'inventory', 'delete'),
    ('inventory.approve', 'Approve purchase orders', 'inventory', 'approve'),
    -- Configurations
    ('config.read', 'View configurations', 'configurations', 'read'),
    ('config.update', 'Update configurations', 'configurations', 'update'),
    ('config.users', 'Manage users', 'configurations', 'create'),
    ('config.roles', 'Manage roles', 'configurations', 'update')
ON CONFLICT (permission_name) DO NOTHING;

-- =============================================================================
-- SEED ROLE PERMISSIONS
-- =============================================================================

-- Super Admin has all permissions
INSERT INTO role_permissions (role, permission_id)
SELECT 'super_admin', permission_id FROM permissions
ON CONFLICT (role, permission_id) DO NOTHING;

-- Admin has most permissions except some sensitive ones
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', permission_id FROM permissions 
WHERE permission_name NOT IN ('config.roles')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Medical Director
INSERT INTO role_permissions (role, permission_id)
SELECT 'medical_director', permission_id FROM permissions 
WHERE module IN ('patient_records', 'opd', 'pharmacy', 'laboratory', 'imaging', 'nursing', 'medical_reports', 'analytics')
   OR permission_name IN ('reports.approve', 'lab.approve', 'imaging.approve')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Doctor
INSERT INTO role_permissions (role, permission_id)
SELECT 'doctor', permission_id FROM permissions 
WHERE module IN ('patient_records', 'opd', 'nursing', 'medical_reports')
   OR permission_name IN ('pharmacy.create', 'pharmacy.read', 'lab.create', 'lab.read', 'imaging.create', 'imaging.read')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Nurse
INSERT INTO role_permissions (role, permission_id)
SELECT 'nurse', permission_id FROM permissions 
WHERE module = 'nursing' 
   OR permission_name IN ('patient.read', 'opd.read', 'pharmacy.read', 'lab.read')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Lab Technician
INSERT INTO role_permissions (role, permission_id)
SELECT 'lab_technician', permission_id FROM permissions 
WHERE module = 'laboratory' 
   OR permission_name IN ('patient.read')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Radiologist
INSERT INTO role_permissions (role, permission_id)
SELECT 'radiologist', permission_id FROM permissions 
WHERE module = 'imaging' 
   OR permission_name IN ('patient.read')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Pharmacist
INSERT INTO role_permissions (role, permission_id)
SELECT 'pharmacist', permission_id FROM permissions 
WHERE module = 'pharmacy' 
   OR permission_name IN ('patient.read', 'inventory.read', 'inventory.update')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Billing Clerk
INSERT INTO role_permissions (role, permission_id)
SELECT 'billing_clerk', permission_id FROM permissions 
WHERE module = 'finance' 
   OR permission_name IN ('patient.read', 'analytics.read')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Cashier
INSERT INTO role_permissions (role, permission_id)
SELECT 'cashier', permission_id FROM permissions 
WHERE module = 'cashier' 
   OR permission_name IN ('patient.read', 'finance.read')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Receptionist
INSERT INTO role_permissions (role, permission_id)
SELECT 'receptionist', permission_id FROM permissions 
WHERE permission_name IN ('patient.create', 'patient.read', 'patient.update', 'cs.create', 'cs.read', 'cs.update')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Customer Service
INSERT INTO role_permissions (role, permission_id)
SELECT 'customer_service', permission_id FROM permissions 
WHERE module = 'customer_service' 
   OR permission_name IN ('patient.read', 'patient.update')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Inventory Manager
INSERT INTO role_permissions (role, permission_id)
SELECT 'inventory_manager', permission_id FROM permissions 
WHERE module = 'inventory' 
   OR permission_name IN ('pharmacy.read')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Config Admin
INSERT INTO role_permissions (role, permission_id)
SELECT 'config_admin', permission_id FROM permissions 
WHERE module = 'configurations'
ON CONFLICT (role, permission_id) DO NOTHING;

-- =============================================================================
-- SEED CONFIGURATION DATA
-- =============================================================================

INSERT INTO config_categories (name, description, icon, display_order) VALUES
    ('General', 'General system settings', 'Settings', 1),
    ('Billing', 'Billing and payment settings', 'CreditCard', 2),
    ('Notifications', 'Notification preferences', 'Bell', 3),
    ('Security', 'Security and access settings', 'Shield', 4),
    ('Integrations', 'Third-party integrations', 'Link', 5),
    ('Printing', 'Print settings and templates', 'Printer', 6)
ON CONFLICT (name) DO NOTHING;

-- Insert default configurations
INSERT INTO system_configurations (category_id, config_key, config_value, config_type, display_name, description) 
SELECT 
    c.category_id,
    'hospital_name',
    '"National Defence College Medical Centre"'::jsonb,
    'string',
    'Hospital Name',
    'The name of the hospital displayed across the system'
FROM config_categories c WHERE c.name = 'General'
ON CONFLICT (config_key) DO NOTHING;

INSERT INTO system_configurations (category_id, config_key, config_value, config_type, display_name, description) 
SELECT 
    c.category_id,
    'default_currency',
    '"NGN"'::jsonb,
    'string',
    'Default Currency',
    'The default currency for billing'
FROM config_categories c WHERE c.name = 'Billing'
ON CONFLICT (config_key) DO NOTHING;

INSERT INTO system_configurations (category_id, config_key, config_value, config_type, display_name, description) 
SELECT 
    c.category_id,
    'session_timeout_minutes',
    '30'::jsonb,
    'number',
    'Session Timeout',
    'Auto logout after inactivity (minutes)'
FROM config_categories c WHERE c.name = 'Security'
ON CONFLICT (config_key) DO NOTHING;

-- =============================================================================
-- SEED INVENTORY CATEGORIES
-- =============================================================================

INSERT INTO inventory_categories (name, description) VALUES
    ('Medical Supplies', 'Consumable medical supplies'),
    ('Equipment', 'Medical equipment'),
    ('Office Supplies', 'Administrative supplies'),
    ('Cleaning Supplies', 'Cleaning and sanitation'),
    ('Laboratory Supplies', 'Lab consumables and reagents'),
    ('Radiology Supplies', 'Imaging consumables')
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- ENABLE RLS ON NEW TABLES
-- =============================================================================

ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_register_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS POLICIES FOR NEW TABLES
-- =============================================================================

-- Inventory policies
CREATE POLICY "Inventory: Read for all staff" ON inventory_items
    FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Inventory: Write for inventory managers" ON inventory_items
    FOR ALL TO authenticated
    USING (get_user_role() IN ('super_admin', 'admin', 'inventory_manager', 'pharmacist'))
    WITH CHECK (get_user_role() IN ('super_admin', 'admin', 'inventory_manager', 'pharmacist'));

-- Configuration policies
CREATE POLICY "Config: Read for all" ON system_configurations
    FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Config: Write for admins" ON system_configurations
    FOR ALL TO authenticated
    USING (get_user_role() IN ('super_admin', 'admin', 'config_admin'))
    WITH CHECK (get_user_role() IN ('super_admin', 'admin', 'config_admin'));

-- Customer feedback policies
CREATE POLICY "Feedback: Full access for CS" ON customer_feedback
    FOR ALL TO authenticated
    USING (get_user_role() IN ('super_admin', 'admin', 'customer_service', 'receptionist'))
    WITH CHECK (get_user_role() IN ('super_admin', 'admin', 'customer_service', 'receptionist'));

-- Appointments policies
CREATE POLICY "Appointments: Full access for CS" ON appointments
    FOR ALL TO authenticated
    USING (get_user_role() IN ('super_admin', 'admin', 'customer_service', 'receptionist', 'doctor', 'nurse'))
    WITH CHECK (get_user_role() IN ('super_admin', 'admin', 'customer_service', 'receptionist'));

CREATE POLICY "Appointments: Read for clinical staff" ON appointments
    FOR SELECT TO authenticated
    USING (get_user_role() IN ('doctor', 'nurse'));

-- Cashier policies
CREATE POLICY "Cashier: Full access for cashiers" ON cash_register_sessions
    FOR ALL TO authenticated
    USING (get_user_role() IN ('super_admin', 'admin', 'cashier', 'billing_clerk'))
    WITH CHECK (get_user_role() IN ('super_admin', 'admin', 'cashier', 'billing_clerk'));

CREATE POLICY "Payments: Full access for cashiers" ON payment_transactions
    FOR ALL TO authenticated
    USING (get_user_role() IN ('super_admin', 'admin', 'cashier', 'billing_clerk'))
    WITH CHECK (get_user_role() IN ('super_admin', 'admin', 'cashier', 'billing_clerk'));

-- Medical reports policies
CREATE POLICY "Medical Reports: Full access for doctors" ON medical_reports
    FOR ALL TO authenticated
    USING (get_user_role() IN ('super_admin', 'admin', 'medical_director', 'doctor'))
    WITH CHECK (get_user_role() IN ('super_admin', 'admin', 'medical_director', 'doctor'));

CREATE POLICY "Medical Reports: Read for nurses" ON medical_reports
    FOR SELECT TO authenticated
    USING (get_user_role() IN ('nurse'));

-- Permissions policies (read-only for most)
CREATE POLICY "Permissions: Read for all" ON permissions
    FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Role Permissions: Read for all" ON role_permissions
    FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Role Permissions: Write for admins" ON role_permissions
    FOR ALL TO authenticated
    USING (get_user_role() IN ('super_admin'))
    WITH CHECK (get_user_role() IN ('super_admin'));

-- =============================================================================
-- SEQUENCE FOR PO NUMBERS
-- =============================================================================

CREATE TABLE IF NOT EXISTS po_sequence (
    sequence_type TEXT PRIMARY KEY,
    prefix TEXT NOT NULL,
    current_number INTEGER DEFAULT 0,
    year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)
);

INSERT INTO po_sequence (sequence_type, prefix, current_number) VALUES
    ('purchase_order', 'PO', 0)
ON CONFLICT (sequence_type) DO NOTHING;

-- Function to generate PO number
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS TEXT AS $$
DECLARE
    next_num INTEGER;
    prefix_val TEXT;
    year_val INTEGER;
BEGIN
    SELECT current_number + 1, prefix, year INTO next_num, prefix_val, year_val
    FROM po_sequence WHERE sequence_type = 'purchase_order' FOR UPDATE;
    
    IF year_val < EXTRACT(YEAR FROM CURRENT_DATE) THEN
        next_num := 1;
        year_val := EXTRACT(YEAR FROM CURRENT_DATE);
    END IF;
    
    UPDATE po_sequence 
    SET current_number = next_num, year = year_val 
    WHERE sequence_type = 'purchase_order';
    
    RETURN prefix_val || '-' || year_val || '-' || LPAD(next_num::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to generate medical report number
CREATE OR REPLACE FUNCTION generate_report_number()
RETURNS TEXT AS $$
DECLARE
    next_num INTEGER;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(document_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO next_num
    FROM medical_reports
    WHERE document_number LIKE 'MR-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-%';
    
    RETURN 'MR-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(next_num::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;
