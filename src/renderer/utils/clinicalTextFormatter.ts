type StructuredExamRecord = Record<string, unknown>;

const INTERNAL_KEYS = new Set([
  '_exam_summary',
  '_version',
  '_template',
  '_care_plan',
  '_clinical_scores',
]);

function toTitleCase(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeSpecialtyLabel(value: string): string {
  return value
    .split(/[_-]/g)
    .filter(Boolean)
    .map(
      (segment) =>
        segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase(),
    )
    .join(' ');
}

function formatScalarValue(value: unknown): string | null {
  if (value == null) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    return toTitleCase(trimmed);
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : null;
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  return null;
}

function formatListValue(values: unknown[]): string | null {
  const cleaned = values
    .map((item) => formatScalarValue(item))
    .filter((item): item is string => Boolean(item))
    .filter((item) => item.toLowerCase() !== 'none')
    .filter((item) => item.toLowerCase() !== 'none identified');

  if (cleaned.length === 0) {
    return null;
  }

  return cleaned.join(', ');
}

function formatStructuredFieldValue(value: unknown): string | null {
  if (Array.isArray(value)) {
    return formatListValue(value);
  }

  return formatScalarValue(value);
}

function buildStructuredExamLines(formData: StructuredExamRecord): string[] {
  const summary =
    typeof formData._exam_summary === 'string'
      ? formData._exam_summary.trim()
      : '';

  const detailLines = Object.entries(formData)
    .filter(([key]) => !INTERNAL_KEYS.has(key))
    .map(([key, value]) => {
      const formattedValue = formatStructuredFieldValue(value);
      if (!formattedValue) {
        return null;
      }

      return `${toTitleCase(key)}: ${formattedValue}`;
    })
    .filter((line): line is string => Boolean(line));

  const importantLines = summary
    ? detailLines.slice(0, 8)
    : detailLines.slice(0, 10);
  const lines: string[] = [];

  if (summary) {
    lines.push(summary);
  }

  if (importantLines.length > 0) {
    lines.push(...importantLines);
  }

  if (!summary && detailLines.length === 0) {
    lines.push('Structured specialty examination recorded.');
  }

  return lines;
}

export function formatSpecialtyExamNarrative(
  specialtyCode: string | null | undefined,
  formData: unknown,
): string {
  if (!formData || typeof formData !== 'object' || Array.isArray(formData)) {
    return '';
  }

  const specialtyLabel = normalizeSpecialtyLabel(specialtyCode || 'specialty');
  const lines = buildStructuredExamLines(formData as StructuredExamRecord);

  return [`Specialty Examination (${specialtyLabel})`, ...lines].join('\n');
}

export function formatClinicalTextForDisplay(
  value: string | null | undefined,
): string {
  if (!value) {
    return '';
  }

  return value
    .split('\n')
    .map((line) => {
      const match = line.match(
        /^Specialty Examination \(([^)]+)\):\s*(\{.*\})$/,
      );
      if (!match) {
        return line;
      }

      try {
        const [, specialtyCode, rawJson] = match;
        return formatSpecialtyExamNarrative(specialtyCode, JSON.parse(rawJson));
      } catch {
        return line;
      }
    })
    .join('\n');
}
