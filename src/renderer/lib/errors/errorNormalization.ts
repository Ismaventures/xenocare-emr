export function getErrorMessage(error: unknown): string {
  if (!error) return '';
  if (error instanceof Error) return error.message || '';
  if (typeof error === 'string') return error;

  if (typeof error === 'object') {
    const record = error as Record<string, unknown>;
    if (typeof record.message === 'string') return record.message;
    if (typeof record.details === 'string') return record.details;
    if (typeof record.error === 'string') return record.error;
  }

  return '';
}

export function isVersionConflictMessage(message: string): boolean {
  const normalized = (message || '').toLowerCase();
  if (!normalized) return false;

  return (
    normalized.includes('requested version') ||
    normalized.includes('existing version') ||
    normalized.includes('version conflict') ||
    normalized.includes('expected version') ||
    (normalized.includes('version') && normalized.includes('less than'))
  );
}

export function isVersionConflictError(error: unknown): boolean {
  const message = getErrorMessage(error);
  if (isVersionConflictMessage(message)) return true;

  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    if (record.code === 'P0003') return true;
  }

  return false;
}

export function toSimpleUserErrorMessage(error: unknown): string {
  if (isVersionConflictError(error)) {
    return 'Another update already saved this record. We refreshed to the latest data.';
  }

  const message = getErrorMessage(error).trim();
  return (
    message || 'Operation could not be completed right now. Please try again.'
  );
}
