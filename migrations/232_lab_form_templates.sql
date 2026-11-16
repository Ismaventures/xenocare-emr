-- Lab form templates per test with version history and rollback support

CREATE TABLE IF NOT EXISTS public.lab_form_templates (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  test_id uuid NOT NULL REFERENCES public.lab_test_catalogue(id) ON DELETE CASCADE,
  template_type varchar(50) NOT NULL,
  template_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  source_request_id uuid NULL REFERENCES public.lab_requests(request_id) ON DELETE SET NULL,
  saved_by uuid NULL REFERENCES public.staff(id) ON DELETE SET NULL,
  rollback_reason text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lab_form_templates_unique_version UNIQUE (test_id, version)
);

CREATE INDEX IF NOT EXISTS idx_lab_form_templates_test_id ON public.lab_form_templates(test_id);
CREATE INDEX IF NOT EXISTS idx_lab_form_templates_active ON public.lab_form_templates(test_id, is_active) WHERE is_active = true;

CREATE OR REPLACE FUNCTION public.enforce_single_active_lab_template()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_active THEN
    UPDATE public.lab_form_templates
    SET is_active = false,
        updated_at = now()
    WHERE test_id = NEW.test_id
      AND id <> NEW.id
      AND is_active = true;
  END IF;

  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_single_active_lab_template ON public.lab_form_templates;
CREATE TRIGGER trg_enforce_single_active_lab_template
BEFORE INSERT OR UPDATE ON public.lab_form_templates
FOR EACH ROW EXECUTE FUNCTION public.enforce_single_active_lab_template();

ALTER TABLE public.lab_form_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lab_form_templates'
      AND policyname = 'lab_form_templates_select_authenticated'
  ) THEN
    CREATE POLICY lab_form_templates_select_authenticated
      ON public.lab_form_templates
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lab_form_templates'
      AND policyname = 'lab_form_templates_insert_authenticated'
  ) THEN
    CREATE POLICY lab_form_templates_insert_authenticated
      ON public.lab_form_templates
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lab_form_templates'
      AND policyname = 'lab_form_templates_update_authenticated'
  ) THEN
    CREATE POLICY lab_form_templates_update_authenticated
      ON public.lab_form_templates
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
