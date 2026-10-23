import type { Discipline, Project, Task } from './types';

export const DEFAULT_DISCIPLINES: Discipline[] = [
  { code: 'FE', tag: 'FE', name: 'Frontend', hue: 250 },
  { code: 'BE', tag: 'BE', name: 'Backend', hue: 300 },
  { code: 'UX', tag: 'UX', name: 'UI/UX', hue: 20 },
  { code: 'OT', tag: 'OTH', name: 'Other', hue: null },
];

export const SWATCH_HUES: (number | null)[] = [250, 300, 20, 200, 340, 110, null];
const NEXT_HUES = [200, 340, 110, 250, 300, 20];

export const discColor = (hue: number | null) => (hue == null ? 'oklch(0.80 0.015 260)' : `oklch(0.78 0.1 ${hue})`);
export const discTint = (hue: number | null) =>
  hue == null ? 'oklch(0.80 0.015 260 / 0.12)' : `oklch(0.78 0.1 ${hue} / 0.14)`;

// ponytail: past 9 collisions the counter reaches 10 and the tag grows to 4 characters
export function genTag(name: string, taken: string[]): string {
  const words = name.split(/[^A-Za-z0-9]+/).filter(Boolean);
  const base = (words.length > 1 ? words.map((w) => w[0]).join('') : words[0] || 'X').slice(0, 3).toUpperCase();
  let tag = base;
  for (let i = 2; taken.includes(tag); i++) tag = base.slice(0, 2) + i;
  return tag;
}

export const nextHue = (used: (number | null)[]) => NEXT_HUES.find((h) => !used.includes(h)) ?? 200;

export const lookup = (disciplines: Discipline[], code: string): Discipline =>
  disciplines.find((d) => d.code === code) ?? { code, tag: code.slice(0, 3).toUpperCase(), name: code, hue: null };

export const usageCount = (projects: Project[], code: string) =>
  projects.flatMap((p) => p.epics.flatMap((e) => e.tasks)).filter((t) => t.d === code).length;

export function groupByDiscipline(tasks: Task[], disciplines: Discipline[]) {
  const known = disciplines.map((d) => d.code);
  const codes = [...known, ...new Set(tasks.map((t) => t.d).filter((c) => !known.includes(c)))];
  return codes
    .map((code) => ({ d: lookup(disciplines, code), tasks: tasks.filter((t) => t.d === code) }))
    .filter((g) => g.tasks.length);
}
