import { DOING, DONE, type Project, type Task } from './types';

export interface Stats {
  total: number;
  done: number;
  doing: number;
  todo: number;
  pct: number;
}

export function stats(tasks: Task[]): Stats {
  let done = 0;
  let doing = 0;
  for (const t of tasks) {
    if (t.s === DONE) done++;
    else if (t.s === DOING) doing++;
  }
  const total = tasks.length;
  // 100% means done: a rounded 199/200 shows 99
  const pct = total ? Math.round((done / total) * 100) : 0;
  return { total, done, doing, todo: total - done - doing, pct: done < total ? Math.min(pct, 99) : pct };
}

export const width = (n: number, total: number) => (total ? `${(n / total) * 100}%` : '0%');

export const isComplete = (s: Stats) => s.total > 0 && s.done === s.total;

export const allTasks = (p: Project) => p.epics.flatMap((e) => e.tasks);

export const isVisible = (t: Task, filter: string, hideDone: boolean) =>
  (filter === 'all' || t.d === filter) && !(hideDone && t.s === DONE);
