-- Widen procedure_name from varchar(200) to text to allow longer procedure names
-- Must drop and recreate the dependent view first
DROP VIEW IF EXISTS public.todays_procedures;

ALTER TABLE public.procedures ALTER COLUMN procedure_name SET DATA TYPE text;

-- Recreate the view
CREATE VIEW public.todays_procedures AS
 SELECT pr.id AS procedure_id,
    pr.procedure_number,
    pr.procedure_name,
    pr.scheduled_date,
    pr.scheduled_duration_minutes,
    pr.priority,
    pr.status,
    pr.location,
    pr.room_number,
    pr.anesthesia_type,
    p.id AS patient_id,
    p.first_name,
    p.surname AS last_name,
    p.emr_number AS hospital_id,
    s.first_name AS surgeon_first_name,
    s.last_name AS surgeon_last_name,
    pr.facility_id
   FROM ((public.procedures pr
     JOIN public.patients p ON ((p.id = pr.patient_id)))
     LEFT JOIN public.staff s ON ((s.id = pr.primary_surgeon_id)))
  WHERE ((date(pr.scheduled_date) = CURRENT_DATE) AND ((pr.status)::text <> ALL (ARRAY[('cancelled'::character varying)::text, ('completed'::character varying)::text])))
  ORDER BY pr.scheduled_date;

-- Restore permissions
GRANT ALL ON TABLE public.todays_procedures TO anon;
GRANT ALL ON TABLE public.todays_procedures TO authenticated;
GRANT ALL ON TABLE public.todays_procedures TO service_role;
