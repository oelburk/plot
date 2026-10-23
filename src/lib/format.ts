export const pad = (n: number) => String(n).padStart(2, '0');

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function relativeTime(iso: string, now = new Date()): string {
  const then = new Date(iso);
  const mins = Math.floor((now.getTime() - then.getTime()) / 60_000);
  if (Number.isNaN(mins) || mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  // ponytail: no year, so dates over a year old look recent; matches the handoff ("Sep 28")
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export const editedLabel = (p: { updatedAt?: string; edited?: string }, now = new Date()) =>
  p.updatedAt ? relativeTime(p.updatedAt, now) : (p.edited ?? 'just now');
