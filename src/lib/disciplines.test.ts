import { expect, it } from 'vitest';
import { DEFAULT_DISCIPLINES, SWATCH_HUES, discColor, discTint, genTag, groupByDiscipline, lookup, nextHue, usageCount } from './disciplines';
import type { Task } from './types';

const task = (d: string): Task => ({ id: d + Math.random(), title: 'x', d, s: 0, notes: '' });

it('generates tags from initials or the first three letters', () => {
  expect(genTag('Content design', [])).toBe('CD');
  expect(genTag('Data', [])).toBe('DAT');
  expect(genTag('qa', [])).toBe('QA');
  expect(genTag('', [])).toBe('X');
});

it('makes tags unique', () => {
  expect(genTag('Data', ['DAT'])).toBe('DA2');
  expect(genTag('Data', ['DAT', 'DA2'])).toBe('DA3');
});

it('picks the next unused hue', () => {
  expect(nextHue([250, 300, 20, null])).toBe(200);
  expect(nextHue([250, 300, 20, 200, null])).toBe(340);
  expect(nextHue([200, 340, 110, 250, 300, 20])).toBe(200);
});

it('builds discipline colors', () => {
  expect(discColor(250)).toBe('oklch(0.78 0.1 250)');
  expect(discTint(250)).toBe('oklch(0.78 0.1 250 / 0.14)');
  expect(discColor(null)).toBe('oklch(0.80 0.015 260)');
  expect(discTint(null)).toBe('oklch(0.80 0.015 260 / 0.12)');
});

it('falls back to a neutral discipline for unknown codes', () => {
  expect(lookup(DEFAULT_DISCIPLINES, 'qa')).toEqual({ code: 'qa', tag: 'QA', name: 'qa', hue: null });
  expect(lookup(DEFAULT_DISCIPLINES, 'FE').name).toBe('Frontend');
});

it('counts tasks using a discipline across projects', () => {
  const projects = [{ id: 'p', name: 'P', desc: '', epics: [{ id: 'e', name: 'E', open: true, tasks: [task('FE'), task('BE'), task('FE')] }] }];
  expect(usageCount(projects, 'FE')).toBe(2);
  expect(usageCount(projects, 'UX')).toBe(0);
});

it('counts usage across several projects and epics', () => {
  const epic = (id: string, ...codes: string[]) => ({ id, name: id, open: true, tasks: codes.map(task) });
  const projects = [
    { id: 'p1', name: 'P1', desc: '', epics: [epic('e1', 'FE', 'BE'), epic('e2', 'FE')] },
    { id: 'p2', name: 'P2', desc: '', epics: [epic('e3', 'FE', 'UX'), epic('e4')] },
  ];
  expect(usageCount(projects, 'FE')).toBe(3);
  expect(usageCount(projects, 'BE')).toBe(1);
  expect(usageCount(projects, 'OT')).toBe(0);
});

it('ships the default disciplines and swatch hues', () => {
  expect(DEFAULT_DISCIPLINES.map((d) => [d.code, d.tag, d.hue])).toEqual([
    ['FE', 'FE', 250],
    ['BE', 'BE', 300],
    ['UX', 'UX', 20],
    ['OT', 'OTH', null],
  ]);
  expect(SWATCH_HUES).toEqual([250, 300, 20, 200, 340, 110, null]);
});

it('groups tasks by discipline in discipline order, unknown codes last, empty groups dropped', () => {
  const groups = groupByDiscipline([task('UX'), task('zz'), task('FE'), task('UX')], DEFAULT_DISCIPLINES);
  expect(groups.map((g) => [g.d.code, g.tasks.length])).toEqual([['FE', 1], ['UX', 2], ['zz', 1]]);
});
