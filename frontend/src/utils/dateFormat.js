// Centralized date formatting helper for student-related dates
// Usage: import { formatDateVN } from './utils/dateFormat';

export function formatDateVN(value) {
  if (!value) return '—';
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('vi-VN');
  } catch {
    return '—';
  }
}
