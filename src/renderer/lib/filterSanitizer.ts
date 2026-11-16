/**
 * PostgREST Filter Sanitizer
 *
 * Prevents filter-injection attacks in Supabase `.or()` / `.filter()` calls.
 * In PostgREST filter syntax, commas separate conditions inside `.or()`.
 * A malicious search term containing `,` could inject additional filter
 * conditions (e.g. `test,secret_col.eq.true`).
 *
 * @module filterSanitizer
 */

/**
 * Characters that have syntactic meaning inside a PostgREST `.or()` filter:
 *  - `,`  → separates conditions
 *  - `(`  → opens an `in(...)` list or nested group
 *  - `)`  → closes an `in(...)` list or nested group
 *
 * Dots (`.`) are technically separators between column.operator.value, but
 * inside the *value* portion they are safe because PostgREST only splits on
 * the first two dots.
 */
const POSTGREST_FILTER_UNSAFE = /[,()]/g;

/**
 * Sanitise a user-supplied value before interpolating it into a PostgREST
 * filter string (`.or()`, `.filter()`, etc.).
 *
 * Strips characters that could alter the filter structure.  This is a
 * defence-in-depth measure — RLS policies are the primary access gate.
 *
 * @example
 * ```ts
 * const safe = sanitizeFilterValue(userInput);
 * query = query.or(`name.ilike.%${safe}%,code.ilike.%${safe}%`);
 * ```
 */
export function sanitizeFilterValue(value: string): string {
  if (!value) return '';
  return value.replace(POSTGREST_FILTER_UNSAFE, '').trim();
}
