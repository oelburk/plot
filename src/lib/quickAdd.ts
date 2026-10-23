import { isComplete, stats } from './progress';
import type { Discipline, Epic, Project } from './types';

const ALIASES: Record<string, string> = {
  fe: 'FE', frontend: 'FE', be: 'BE', backend: 'BE', ux: 'UX', ui: 'UX', design: 'UX', other: 'OT', oth: 'OT', ot: 'OT',
};

export function parseQuickAdd(
  query: string,
  project: Project,
  disciplines: Discipline[],
  focusEpicId: string | null,
): { title: string; d: string; epic: Epic | undefined } {
  // null prototype: `#constructor` and `#__proto__` must not resolve to inherited properties
  const map: Record<string, string> = Object.create(null);
  for (const [k, code] of Object.entries(ALIASES)) if (disciplines.some((x) => x.code === code)) map[k] = code;
  for (const x of disciplines) {
    map[x.tag.toLowerCase()] = x.code;
    map[x.code.toLowerCase()] = x.code;
    map[x.name.toLowerCase().replace(/[^a-z0-9]/g, '')] = x.code;
  }

  let d = disciplines.some((x) => x.code === 'OT') ? 'OT' : (disciplines[0]?.code ?? 'OT');
  let epic: Epic | undefined;
  const words: string[] = [];
  for (const w of query.trim().split(/\s+/)) {
    const key = w.slice(1).toLowerCase();
    if (w[0] === '#' && map[key]) d = map[key];
    else if (w[0] === '@' && key) {
      const byName = (fn: (name: string) => boolean) => project.epics.find((e) => fn(e.name.toLowerCase()));
      epic = byName((n) => n.startsWith(key)) ?? byName((n) => n.includes(key)) ?? epic;
    } else if (w) words.push(w);
  }

  epic ??=
    project.epics.find((e) => e.id === focusEpicId) ??
    project.epics.find((e) => e.tasks.length && !isComplete(stats(e.tasks))) ??
    project.epics[0];
  return { title: words.join(' '), d, epic };
}

export const hasQuickSyntax = (query: string) => /(^|\s)[#@]/.test(query);
