export interface PrintableField {
  key: string;
  label: string;
  value: string;
}

interface ExtractPrintableFieldsOptions {
  excludeKeys?: string[];
  maxDepth?: number;
}

const DEFAULT_EXCLUDED_KEYS = new Set([
  'id',
  'created_at',
  'updated_at',
  'deleted_at',
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function isMeaningful(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function humanizeKey(key: string): string {
  return key
    .replace(/\./g, ' / ')
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number')
    return Number.isFinite(value) ? String(value) : '';
  if (typeof value === 'string') return value.trim();

  if (Array.isArray(value)) {
    if (
      value.every(
        (item) => typeof item === 'string' || typeof item === 'number',
      )
    ) {
      return value.map((item) => String(item)).join(', ');
    }
    return JSON.stringify(value, null, 2);
  }

  if (isPlainObject(value)) {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

function flattenRecord(
  input: Record<string, unknown>,
  options: Required<ExtractPrintableFieldsOptions>,
  parentKey = '',
  depth = 0,
): PrintableField[] {
  const fields: PrintableField[] = [];

  for (const [rawKey, rawValue] of Object.entries(input)) {
    if (options.excludeKeys.includes(rawKey)) continue;
    if (!isMeaningful(rawValue)) continue;

    const key = parentKey ? `${parentKey}.${rawKey}` : rawKey;

    if (isPlainObject(rawValue) && depth < options.maxDepth) {
      const nested = flattenRecord(rawValue, options, key, depth + 1);
      if (nested.length > 0) {
        fields.push(...nested);
        continue;
      }
    }

    const value = stringifyValue(rawValue);
    if (!value) continue;

    fields.push({
      key,
      label: humanizeKey(key),
      value,
    });
  }

  return fields;
}

export function extractPrintableFields(
  input: Record<string, unknown> | null | undefined,
  options?: ExtractPrintableFieldsOptions,
): PrintableField[] {
  if (!input) return [];

  const merged: Required<ExtractPrintableFieldsOptions> = {
    excludeKeys: [
      ...Array.from(DEFAULT_EXCLUDED_KEYS),
      ...(options?.excludeKeys || []),
    ],
    maxDepth: options?.maxDepth ?? 2,
  };

  return flattenRecord(input, merged);
}
