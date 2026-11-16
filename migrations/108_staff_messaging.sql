-- =============================================================================
-- NDC Medical Centre EMR - Staff Internal Messaging System
-- Migration: 108_staff_messaging.sql
-- =============================================================================
-- Creates an internal messaging system for staff-to-staff communication
-- Supports sending notes/messages between departments and individual staff members
-- =============================================================================

-- Create message priority enum
DO $$ BEGIN
    CREATE TYPE message_priority AS ENUM (
        'low',
        'normal',
        'high',
        'urgent'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create message status enum
DO $$ BEGIN
    CREATE TYPE message_status AS ENUM (
        'sent',
        'delivered',
        'read',
        'archived',
        'deleted'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================================================
-- STAFF_MESSAGES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS "public"."staff_messages" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Sender information
    "sender_id" UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    "sender_department_id" UUID REFERENCES departments(id) ON DELETE SET NULL,

    -- Recipient information (can target user, role, or department)
    "recipient_id" UUID REFERENCES staff(id) ON DELETE CASCADE,
    "recipient_department_id" UUID REFERENCES departments(id) ON DELETE SET NULL,
    "recipient_department_name" VARCHAR(255), -- Fallback when departments table is empty
    "recipient_role" VARCHAR(50), -- Can target a specific role

    -- Message content
    "subject" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "priority" message_priority DEFAULT 'normal',

    -- Status tracking
    "status" message_status DEFAULT 'sent',
    "is_read" BOOLEAN DEFAULT false,
    "read_at" TIMESTAMP WITH TIME ZONE,

    -- Optional: Related entities for context
    "patient_id" UUID REFERENCES patients(id) ON DELETE SET NULL,
    "encounter_id" UUID REFERENCES visits(id) ON DELETE SET NULL,

    -- Threading support
    "parent_message_id" UUID REFERENCES staff_messages(id) ON DELETE SET NULL,
    "thread_id" UUID, -- All messages in a thread share this ID

    -- Metadata
    "metadata" JSONB DEFAULT '{}',
    "attachments" JSONB DEFAULT '[]', -- Array of attachment references

    -- Timestamps
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),

    -- Soft delete support
    "deleted_at" TIMESTAMP WITH TIME ZONE,
    "deleted_by" UUID REFERENCES staff(id) ON DELETE SET NULL,

    -- Facility scope
    "facility_id" UUID REFERENCES facilities(id) ON DELETE CASCADE,

    -- Ensure at least one recipient target is specified
    CONSTRAINT "at_least_one_recipient" CHECK (
        recipient_id IS NOT NULL OR
        recipient_department_id IS NOT NULL OR
        recipient_department_name IS NOT NULL OR
        recipient_role IS NOT NULL
    )
);

ALTER TABLE "public"."staff_messages" OWNER TO "postgres";

-- Add comments
COMMENT ON TABLE "public"."staff_messages" IS 'Internal messaging system for staff-to-staff communication';
COMMENT ON COLUMN "public"."staff_messages"."recipient_id" IS 'Direct message to a specific staff member';
COMMENT ON COLUMN "public"."staff_messages"."recipient_department_id" IS 'Message to all staff in a department';
COMMENT ON COLUMN "public"."staff_messages"."recipient_role" IS 'Message to all staff with a specific role';
COMMENT ON COLUMN "public"."staff_messages"."thread_id" IS 'Groups related messages in a conversation thread';

-- =============================================================================
-- MESSAGE_RECIPIENTS TABLE (for tracking individual read status in group messages)
-- =============================================================================

CREATE TABLE IF NOT EXISTS "public"."message_recipients" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "message_id" UUID NOT NULL REFERENCES staff_messages(id) ON DELETE CASCADE,
    "recipient_id" UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    "is_read" BOOLEAN DEFAULT false,
    "read_at" TIMESTAMP WITH TIME ZONE,
    "is_archived" BOOLEAN DEFAULT false,
    "archived_at" TIMESTAMP WITH TIME ZONE,
    "is_deleted" BOOLEAN DEFAULT false,
    "deleted_at" TIMESTAMP WITH TIME ZONE,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),

    -- Prevent duplicate entries
    CONSTRAINT "unique_message_recipient" UNIQUE (message_id, recipient_id)
);

ALTER TABLE "public"."message_recipients" OWNER TO "postgres";

COMMENT ON TABLE "public"."message_recipients" IS 'Tracks read/archive status for each recipient of a message';

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Sender and recipient lookups
CREATE INDEX IF NOT EXISTS "idx_staff_messages_sender" ON "public"."staff_messages"("sender_id");
CREATE INDEX IF NOT EXISTS "idx_staff_messages_recipient" ON "public"."staff_messages"("recipient_id");
CREATE INDEX IF NOT EXISTS "idx_staff_messages_recipient_dept" ON "public"."staff_messages"("recipient_department_id");
CREATE INDEX IF NOT EXISTS "idx_staff_messages_recipient_role" ON "public"."staff_messages"("recipient_role");

-- Thread and reply lookups
CREATE INDEX IF NOT EXISTS "idx_staff_messages_thread" ON "public"."staff_messages"("thread_id");
CREATE INDEX IF NOT EXISTS "idx_staff_messages_parent" ON "public"."staff_messages"("parent_message_id");

-- Status and unread filtering
CREATE INDEX IF NOT EXISTS "idx_staff_messages_status" ON "public"."staff_messages"("status");
CREATE INDEX IF NOT EXISTS "idx_staff_messages_is_read" ON "public"."staff_messages"("is_read");

-- Date-based queries
CREATE INDEX IF NOT EXISTS "idx_staff_messages_created" ON "public"."staff_messages"("created_at" DESC);

-- Context lookups
CREATE INDEX IF NOT EXISTS "idx_staff_messages_patient" ON "public"."staff_messages"("patient_id");
CREATE INDEX IF NOT EXISTS "idx_staff_messages_encounter" ON "public"."staff_messages"("encounter_id");

-- Message recipients indexes
CREATE INDEX IF NOT EXISTS "idx_message_recipients_message" ON "public"."message_recipients"("message_id");
CREATE INDEX IF NOT EXISTS "idx_message_recipients_recipient" ON "public"."message_recipients"("recipient_id");
CREATE INDEX IF NOT EXISTS "idx_message_recipients_unread" ON "public"."message_recipients"("recipient_id") WHERE NOT is_read;

-- =============================================================================
-- TRIGGER FUNCTIONS (SECURITY DEFINER to bypass RLS)
-- =============================================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_staff_messages_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS staff_messages_updated_at ON staff_messages;
CREATE TRIGGER staff_messages_updated_at
    BEFORE UPDATE ON staff_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_staff_messages_timestamp();

-- Auto-set thread_id for new threads
CREATE OR REPLACE FUNCTION set_message_thread_id()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is a reply, inherit the thread_id from parent
    IF NEW.parent_message_id IS NOT NULL THEN
        SELECT COALESCE(thread_id, id) INTO NEW.thread_id
        FROM staff_messages WHERE id = NEW.parent_message_id;
    ELSE
        -- New thread, use the message's own ID
        NEW.thread_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS staff_messages_set_thread ON staff_messages;
CREATE TRIGGER staff_messages_set_thread
    BEFORE INSERT ON staff_messages
    FOR EACH ROW
    EXECUTE FUNCTION set_message_thread_id();

-- Auto-populate message_recipients for department/role messages
CREATE OR REPLACE FUNCTION populate_message_recipients()
RETURNS TRIGGER AS $$
DECLARE
    recipient_count INTEGER := 0;
    dept_name TEXT;
BEGIN
    -- For direct messages, create single recipient entry
    IF NEW.recipient_id IS NOT NULL THEN
        INSERT INTO message_recipients (message_id, recipient_id)
        VALUES (NEW.id, NEW.recipient_id)
        ON CONFLICT (message_id, recipient_id) DO NOTHING;
        recipient_count := recipient_count + 1;
    END IF;

    -- For department messages (by ID), create entries for all staff in department
    IF NEW.recipient_department_id IS NOT NULL THEN
        -- Get the department name from departments table
        SELECT name INTO dept_name FROM departments WHERE id = NEW.recipient_department_id;

        -- Match staff by department_id OR department name
        INSERT INTO message_recipients (message_id, recipient_id)
        SELECT NEW.id, s.id
        FROM staff s
        WHERE (
            s.department_id = NEW.recipient_department_id
            OR s.department = dept_name
        )
          AND s.is_active = true
          AND s.id != NEW.sender_id
        ON CONFLICT (message_id, recipient_id) DO NOTHING;

        GET DIAGNOSTICS recipient_count = ROW_COUNT;
    END IF;

    -- For department messages (by name - fallback when departments table is empty)
    IF NEW.recipient_department_name IS NOT NULL THEN
        INSERT INTO message_recipients (message_id, recipient_id)
        SELECT NEW.id, s.id
        FROM staff s
        WHERE s.department = NEW.recipient_department_name
          AND s.is_active = true
          AND s.id != NEW.sender_id
        ON CONFLICT (message_id, recipient_id) DO NOTHING;

        GET DIAGNOSTICS recipient_count = ROW_COUNT;

        IF recipient_count = 0 THEN
            RAISE NOTICE 'No active staff found in department %', NEW.recipient_department_name;
        END IF;
    END IF;

    -- For role-based messages, create entries for all staff with that role
    IF NEW.recipient_role IS NOT NULL THEN
        INSERT INTO message_recipients (message_id, recipient_id)
        SELECT NEW.id, s.id
        FROM staff s
        WHERE s.role::text = NEW.recipient_role
          AND s.is_active = true
          AND s.id != NEW.sender_id
        ON CONFLICT (message_id, recipient_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS staff_messages_populate_recipients ON staff_messages;
CREATE TRIGGER staff_messages_populate_recipients
    AFTER INSERT ON staff_messages
    FOR EACH ROW
    EXECUTE FUNCTION populate_message_recipients();

-- =============================================================================
-- HELPER FUNCTIONS (SECURITY DEFINER)
-- =============================================================================

-- Get unread message count for a staff member
CREATE OR REPLACE FUNCTION get_unread_message_count(p_staff_id UUID DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    IF p_staff_id IS NULL THEN
        RETURN 0;
    END IF;

    SELECT COUNT(*)::INTEGER INTO v_count
    FROM message_recipients mr
    WHERE mr.recipient_id = p_staff_id
      AND NOT mr.is_read
      AND NOT mr.is_deleted;

    RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_unread_message_count(UUID) TO authenticated;

-- Mark message as read
CREATE OR REPLACE FUNCTION mark_message_read(p_message_id UUID, p_staff_id UUID DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
    IF p_staff_id IS NULL THEN
        RETURN;
    END IF;

    UPDATE message_recipients
    SET is_read = true, read_at = now()
    WHERE message_id = p_message_id
      AND recipient_id = p_staff_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION mark_message_read(UUID, UUID) TO authenticated;

-- Mark all messages as read for a staff member
CREATE OR REPLACE FUNCTION mark_all_messages_read(p_staff_id UUID)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE message_recipients
    SET is_read = true, read_at = now()
    WHERE recipient_id = p_staff_id
      AND NOT is_read
      AND NOT is_deleted;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION mark_all_messages_read(UUID) TO authenticated;

-- =============================================================================
-- VIEW FOR INBOX
-- =============================================================================

CREATE OR REPLACE VIEW "public"."staff_messages_inbox_view" AS
SELECT
    sm.id,
    sm.subject,
    sm.message,
    sm.priority,
    sm.created_at,
    sm.thread_id,
    sm.parent_message_id,
    sm.patient_id,
    sm.encounter_id,
    sm.metadata,
    sm.attachments,
    sm.recipient_department_id,
    sm.recipient_department_name,
    sm.recipient_role,
    -- Sender info
    sm.sender_id,
    s.first_name || ' ' || s.last_name AS sender_name,
    s.role AS sender_role,
    sd.name AS sender_department,
    -- Recipient info
    mr.recipient_id,
    mr.is_read,
    mr.read_at,
    mr.is_archived,
    -- Patient context (if any)
    p.first_name || ' ' || p.surname AS patient_name,
    p.emr_number AS patient_emr_number
FROM staff_messages sm
JOIN message_recipients mr ON sm.id = mr.message_id
JOIN staff s ON sm.sender_id = s.id
LEFT JOIN departments sd ON sm.sender_department_id = sd.id
LEFT JOIN patients p ON sm.patient_id = p.id
WHERE NOT mr.is_deleted
  AND sm.deleted_at IS NULL
ORDER BY sm.created_at DESC;

ALTER VIEW "public"."staff_messages_inbox_view" OWNER TO "postgres";

-- =============================================================================
-- PERMISSIONS - No RLS for staff messaging (auth handled at app level)
-- =============================================================================

-- Grant full access to authenticated users
GRANT ALL ON TABLE "public"."staff_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."message_recipients" TO "authenticated";
GRANT SELECT ON "public"."staff_messages_inbox_view" TO "authenticated";

-- Ensure sequences are accessible
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =============================================================================
-- ENABLE REALTIME (optional - comment out if not using Supabase realtime)
-- =============================================================================

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE staff_messages;
EXCEPTION
    WHEN undefined_object THEN null;
    WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE message_recipients;
EXCEPTION
    WHEN undefined_object THEN null;
    WHEN duplicate_object THEN null;
END $$;

-- =============================================================================
-- DONE
-- =============================================================================

COMMENT ON FUNCTION get_unread_message_count(UUID) IS 'Returns count of unread messages for a staff member';
COMMENT ON FUNCTION mark_message_read(UUID, UUID) IS 'Marks a specific message as read for a staff member';
COMMENT ON FUNCTION mark_all_messages_read(UUID) IS 'Marks all unread messages as read for a staff member';
