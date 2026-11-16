/**
 * Application feature flags.
 *
 * NHIS is disabled for deployments where the facility is not NHIS-accredited.
 * All NHIS workflows, billing rules, patient fields, approvals and background
 * processes must treat this flag as the single source of truth.
 */
export const FEATURES = {
  nhis: false,
} as const;

export function isNhisFeatureEnabled(): boolean {
  return FEATURES.nhis;
}

/**
 * Detects NHIS-backed insurance/payment categories, including legacy
 * categories that must be treated as self-pay while NHIS is disabled.
 */
export function isNhisCategory(
  value: string | null | undefined,
): boolean {
  if (!value) return false;
  const normalized = value.toLowerCase().replace(/_/g, ' ').trim();
  return (
    normalized.includes('nhis') ||
    normalized === 'dhml' ||
    normalized === 'gifship'
  );
}
