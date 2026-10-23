import { expect, it } from 'vitest';
import { editedLabel, pad, plural, relativeTime } from './format';

const now = new Date(2026, 9, 21, 12, 0, 0);
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();
const MIN = 60_000;

it('pads indices', () => {
  expect(pad(3)).toBe('03');
  expect(pad(12)).toBe('12');
});

it('pluralises', () => {
  expect(plural(1, 'task')).toBe('1 task');
  expect(plural(0, 'task')).toBe('0 tasks');
});

it('formats relative times', () => {
  expect(relativeTime(ago(30_000), now)).toBe('just now');
  expect(relativeTime(ago(5 * MIN), now)).toBe('5m ago');
  expect(relativeTime(ago(120 * MIN), now)).toBe('2h ago');
  expect(relativeTime(ago(30 * 60 * MIN), now)).toBe('yesterday');
  expect(relativeTime(ago(3 * 24 * 60 * MIN), now)).toBe('3 days ago');
  expect(relativeTime(ago(10 * 24 * 60 * MIN), now)).toBe('Oct 11');
});

it('treats future and invalid timestamps as just now', () => {
  expect(relativeTime(ago(-5 * MIN), now)).toBe('just now');
  expect(relativeTime('not a date', now)).toBe('just now');
  expect(relativeTime('', now)).toBe('just now');
});

it('prefers updatedAt and falls back to the legacy edited string', () => {
  expect(editedLabel({ updatedAt: ago(2 * MIN), edited: '2h ago' }, now)).toBe('2m ago');
  expect(editedLabel({ edited: 'Sep 28' }, now)).toBe('Sep 28');
  expect(editedLabel({}, now)).toBe('just now');
});
