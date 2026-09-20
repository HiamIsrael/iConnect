export function initials(name = '') {
  return name
    .replace(/[^A-Za-z ]/g, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

const gradients = [
  ['#f5576c', '#f093fb'],
  ['#4dd0e1', '#2196f3'],
  ['#43e97b', '#38f9d7'],
  ['#f7971e', '#ffd200'],
  ['#7f00ff', '#e100ff'],
  ['#00c9ff', '#92fe9d'],
  ['#fa709a', '#fee140'],
];

export function gradientFor(value = '') {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  const [a, b] = gradients[hash % gradients.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

export function formatMoney(amount = 0, currency = 'NGN') {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateShort(value) {
  if (!value) return '—';
  const d = new Date(value);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function timeAgo(value) {
  if (!value) return '';
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  const intervals = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [name, size] of intervals) {
    const count = Math.floor(seconds / size);
    if (count >= 1) return `${count} ${name}${count > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}
