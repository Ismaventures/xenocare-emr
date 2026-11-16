/**
 * Centralized staff display name utilities.
 *
 * Derives a professional title prefix from the staff `role` field
 * and formats "Title FirstName LastName" consistently across the app.
 */

/**
 * Returns a professional title prefix based on the staff role.
 *
 * Covers all `StaffRole` enum values in the database.
 */
export function getStaffTitle(role: string | null | undefined): string {
  if (!role) return '';
  const r = role.toLowerCase();

  // Ophthalmology-specific
  if (r.includes('ophthalmolog')) return 'Ophthalmologist';
  if (r.includes('optometrist') || r.includes('optometry')) return 'Optometrist';

  // Dental
  if (r.includes('dentist') || r.includes('dental')) return 'Dr.';

  // Doctor / physician umbrella
  if (
    r.includes('doctor') ||
    r.includes('physician') ||
    r.includes('surgeon') ||
    r.includes('consultant') ||
    r.includes('specialist') ||
    r.includes('medical_director') ||
    r.includes('medical officer')
  )
    return 'Dr.';

  // Allied health
  if (r.includes('nurse')) return 'Nurse';
  if (r.includes('pharmacist')) return 'Pharm.';
  if (r.includes('physio') || r.includes('therapist')) return 'PT';
  if (r.includes('radiolog')) return 'Rad.';
  if (r.includes('lab_technician') || r.includes('lab technician')) return 'Lab Tech.';

  return '';
}

/**
 * Formats a staff member's display name with their professional title.
 *
 * Examples:
 *   formatStaffName('John', 'Doe', 'doctor')        → "Dr. John Doe"
 *   formatStaffName('Jane', 'Smith', 'nurse')        → "Nurse Jane Smith"
 *   formatStaffName('Ama', 'Mensah', 'ophthalmologist') → "Ophthalmologist Ama Mensah"
 *   formatStaffName('', '', null)                     → "Unknown"
 */
export function formatStaffName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  role: string | null | undefined,
  fallback = 'Unknown',
): string {
  const first = (firstName || '').trim();
  const last = (lastName || '').trim();
  const fullName = [first, last].filter(Boolean).join(' ') || fallback;
  const title = getStaffTitle(role);
  return title ? `${title} ${fullName}` : fullName;
}
