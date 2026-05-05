export const badgeClass = {
  Expired: 'brand-danger',
  'Expiring Soon': 'brand-amber',
  Safe: 'brand-soft',
  Unknown: 'bg-[color:var(--surface-2)] text-[color:var(--muted)] border-[color:var(--border)]'
};

export const severityClass = {
  red: 'brand-danger',
  yellow: 'brand-amber',
  green: 'brand-soft'
};

export const scoreTone = (score = 0) => {
  if (score >= 80) return 'text-[color:var(--green)] bg-[color:var(--green-soft)] border-[color:var(--border)]';
  if (score >= 60) return 'text-[#1b4a7a] bg-[color:var(--amber-soft)] border-[color:var(--border)]';
  return 'text-[#a52f43] bg-[color:var(--danger-soft)] border-[color:var(--border)]';
};

export const formatScanTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString();
};

export const shortAgo = (value) => {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return '--';

  const diffMin = Math.max(1, Math.round((Date.now() - time) / 60000));
  if (diffMin < 60) return `${diffMin} min ago`;

  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;

  return `${Math.round(diffHours / 24)} day ago`;
};

export const statusToProgress = {
  Safe: 15,
  'Expiring Soon': 55,
  Expired: 92,
  Unknown: 35
};
