export function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr + (dateStr.includes('Z') ? '' : 'Z'));
  const seconds = Math.floor((now - date) / 1000);

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
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === now.toDateString()) {
    return `Today, ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return `Tomorrow, ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
    `, ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}

export function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
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
