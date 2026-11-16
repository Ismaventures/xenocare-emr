-- Enable RLS on staff table
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- Policy for viewing staff (everyone needs to see staff for dropdowns etc)
CREATE POLICY staff_select_all ON staff
  FOR SELECT TO authenticated
  USING (true);

-- Policy for inserting staff (only admins)
CREATE POLICY staff_insert_admin ON staff
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff s 
      WHERE s.user_id = auth.uid() 
      AND s.role IN ('super_admin', 'admin', 'medical_director', 'config_admin')
    )
  );

-- Policy for updating staff (only admins)
CREATE POLICY staff_update_admin ON staff
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff s 
      WHERE s.user_id = auth.uid() 
      AND s.role IN ('super_admin', 'admin', 'medical_director', 'config_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff s 
      WHERE s.user_id = auth.uid() 
      AND s.role IN ('super_admin', 'admin', 'medical_director', 'config_admin')
    )
  );

-- Policy for deleting staff (only admins)
CREATE POLICY staff_delete_admin ON staff
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff s 
      WHERE s.user_id = auth.uid() 
      AND s.role IN ('super_admin', 'admin', 'medical_director', 'config_admin')
    )
  );
