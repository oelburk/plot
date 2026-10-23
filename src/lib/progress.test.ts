import { describe, expect, it } from 'vitest';
import { allTasks, isComplete, isVisible, stats, width } from './progress';
import { DOING, DONE, TODO, type Status, type Task } from './types';

const t = (s: Status, d = 'FE'): Task => ({ id: Math.random().toString(), title: 'x', d, s, notes: '' });

describe('stats', () => {
  it('is 0% with no tasks', () => {
    expect(stats([])).toEqual({ total: 0, done: 0, doing: 0, todo: 0, pct: 0 });
  });
  it('counts in progress as 0', () => {
    expect(stats([t(DONE), t(DOING)]).pct).toBe(50);
  });
  it('rounds to whole percents', () => {
    expect(stats([t(DONE), t(TODO), t(TODO)]).pct).toBe(33);
    expect(stats([t(DONE), t(DONE), t(TODO)]).pct).toBe(67);
  });
  it('shows 99% until every task is done', () => {
    expect(stats([...Array.from({ length: 199 }, () => t(DONE)), t(TODO)]).pct).toBe(99);
    expect(stats([t(DONE), t(DONE)]).pct).toBe(100);
  });
  it('counts each status', () => {
    expect(stats([t(DONE), t(DOING), t(TODO), t(TODO)])).toMatchObject({ total: 4, done: 1, doing: 1, todo: 2 });
  });
});

it('builds bar widths', () => {
  expect(width(1, 4)).toBe('25%');
  expect(width(0, 0)).toBe('0%');
});

it('is complete only with tasks and 100%', () => {
  expect(isComplete(stats([]))).toBe(false);
  expect(isComplete(stats([t(DONE)]))).toBe(true);
  expect(isComplete(stats([t(DONE), t(DOING)]))).toBe(false);
  const almost = [...Array.from({ length: 199 }, () => t(DONE)), t(TODO)];
  expect(isComplete(stats(almost))).toBe(false);
});

it('flattens project tasks', () => {
  const p = { id: 'p', name: 'P', desc: '', epics: [{ id: 'e1', name: 'A', open: true, tasks: [t(DONE)] }, { id: 'e2', name: 'B', open: false, tasks: [t(TODO), t(TODO)] }] };
  expect(allTasks(p)).toHaveLength(3);
});

it('filters by discipline and hide done', () => {
  expect(isVisible(t(DONE, 'FE'), 'all', false)).toBe(true);
  expect(isVisible(t(DONE, 'FE'), 'all', true)).toBe(false);
  expect(isVisible(t(TODO, 'FE'), 'BE', false)).toBe(false);
  expect(isVisible(t(TODO, 'BE'), 'BE', true)).toBe(true);
  expect(isVisible(t(DOING), 'all', true)).toBe(true);
});
