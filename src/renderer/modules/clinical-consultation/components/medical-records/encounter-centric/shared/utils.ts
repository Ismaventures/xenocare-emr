/**
 * Shared utility functions for Encounter-Centric View
 */

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function calculateAge(dob: string | null | undefined): string {
  if (!dob) return 'N/A';
  const birthDate = new Date(dob);
  const today = new Date();
  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  let days = today.getDate() - birthDate.getDate();
  if (days < 0) {
    months--;
    const prev = new Date(today.getFullYear(), today.getMonth(), 0);
    days += prev.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }
  if (years === 0 && months === 0) {
    const weeks = Math.floor(days / 7);
    const rem = days % 7;
    if (weeks > 0 && rem > 0) return `${weeks}w ${rem}d`;
    if (weeks > 0) return `${weeks}w`;
    return `${days}d`;
  }
  if (years === 0) {
    const parts = [`${months}m`];
    if (days > 0) parts.push(`${days}d`);
    return parts.join(' ');
  }
  const parts = [`${years}y`];
  if (months > 0) parts.push(`${months}m`);
  if (days > 0) parts.push(`${days}d`);
  return parts.join(' ');
}

export function getRelativeDateLabel(
  dateString: string | null | undefined,
): string | null {
  if (!dateString) return null;
  const date = new Date(dateString);
  const now = new Date();

  // Reset time for accurate day comparison
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const n = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffTime = n.getTime() - d.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return null;
}

export function getRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();

  // Reset time part for date comparison to handle "Today/Yesterday" correctly based on calendar days,
  // or use simple difference for "ago".
  // Simple difference approach is usually requested for "X days ago".

  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 30) return `${diffInDays} days ago`;

  return '';
}
