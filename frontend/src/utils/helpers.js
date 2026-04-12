// Safely parse a date string. Returns null if invalid/empty.
export function parseDate(dateStr) {
  if (!dateStr) return null;
  // If the string has no timezone info, treat it as UTC to stay consistent
  // across timezones (Supabase timestamps without 'Z' are effectively UTC).
  const normalized =
    typeof dateStr === 'string' &&
    !dateStr.includes('Z') &&
    !dateStr.match(/[+-]\d{2}:?\d{2}$/) &&
    dateStr.includes('T')
      ? dateStr + 'Z'
      : dateStr;
  const date = new Date(normalized);
  return isNaN(date.getTime()) ? null : date;
}

export function timeAgo(dateStr) {
  const date = parseDate(dateStr);
  if (!date) return '';

  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 0) {
    // Future date — fall through to absolute formatting
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function formatDate(dateStr) {
  const date = parseDate(dateStr);
  if (!date) return 'Flexible';

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === now.toDateString()) {
    return `Today, ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return `Tomorrow, ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }
  return (
    date.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
    `, ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
  );
}

export function formatMonthYear(dateStr, fallback = 'Recently') {
  const date = parseDate(dateStr);
  if (!date) return fallback;

  return date.toLocaleDateString([], { month: 'long', year: 'numeric' });
}

export function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// A task is "expired" when its scheduled date is in the past but it's still open.
export function isTaskExpired(task) {
  if (!task) return false;
  if (task.status !== 'open') return false;
  if (task.dateType === 'asap') return false;
  const date = parseDate(task.dateTime);
  if (!date) return false;
  return date.getTime() < Date.now();
}

// A task is "inactive" when it's filled, completed, cancelled, or expired.
// Inactive tasks get a greyed-out visual treatment.
export function isTaskInactive(task) {
  if (!task) return false;
  if (['filled', 'completed', 'cancelled'].includes(task.status)) return true;
  return isTaskExpired(task);
}

// Human-readable label for the inactive state.
export function taskInactiveLabel(task) {
  if (!task) return '';
  if (task.status === 'completed') return 'Completed';
  if (task.status === 'filled') return 'Filled';
  if (task.status === 'cancelled') return 'Cancelled';
  if (isTaskExpired(task)) return 'Expired';
  return '';
}

export const CATEGORY_COLORS = {
  'Moving & Heavy Lifting': { bg: '#fee2e2', text: '#dc2626' },
  'Delivery & Pickup': { bg: '#dbeafe', text: '#2563eb' },
  'Academic Help': { bg: '#fef3c7', text: '#d97706' },
  'Tech Help': { bg: '#e0e7ff', text: '#4f46e5' },
  'Errands': { bg: '#ffedd5', text: '#ea580c' },
  'Cleaning & Organization': { bg: '#fce7f3', text: '#db2777' },
  'Assembly & Setup': { bg: '#ffedd5', text: '#ea580c' },
  'Event Help': { bg: '#f3e8ff', text: '#9333ea' },
  'Creative & Design': { bg: '#ccfbf1', text: '#0d9488' },
  'Other': { bg: '#f3f4f6', text: '#6b7280' },
};

export const CATEGORY_ICONS = {
  'Moving & Heavy Lifting': '📦',
  'Delivery & Pickup': '🚗',
  'Academic Help': '📚',
  'Tech Help': '💻',
  'Errands': '🏃',
  'Cleaning & Organization': '🧹',
  'Assembly & Setup': '🔧',
  'Event Help': '🎉',
  'Creative & Design': '🎨',
  'Other': '✨',
};
