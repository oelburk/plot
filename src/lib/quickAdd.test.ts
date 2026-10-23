import { describe, expect, it } from 'vitest';
import { DEFAULT_DISCIPLINES } from './disciplines';
import { hasQuickSyntax, parseQuickAdd } from './quickAdd';
import type { Project } from './types';

const project: Project = {
  id: 'p',
  name: 'Atlas',
  desc: '',
  epics: [
    { id: 'e1', name: 'Discovery', open: false, tasks: [{ id: 't1', title: 'a', d: 'UX', s: 2, notes: '' }] },
    { id: 'e2', name: 'Accounts & auth', open: true, tasks: [{ id: 't2', title: 'b', d: 'BE', s: 1, notes: '' }] },
    { id: 'e3', name: 'Billing', open: false, tasks: [] },
  ],
};
const parse = (q: string, focus: string | null = null, discs = DEFAULT_DISCIPLINES) => parseQuickAdd(q, project, discs, focus);

describe('parseQuickAdd', () => {
  it('parses the handoff example', () => {
    const r = parse('Wire up invoice filters #fe @bill');
    expect(r).toMatchObject({ title: 'Wire up invoice filters', d: 'FE' });
    expect(r.epic?.id).toBe('e3');
  });
  it('matches epics by prefix, then substring', () => {
    expect(parse('x @acc').epic?.id).toBe('e2');
    expect(parse('x @auth').epic?.id).toBe('e2');
    const later: Project = {
      ...project,
      epics: [
        { id: 'a', name: 'Pre-launch', open: false, tasks: [] },
        { id: 'b', name: 'Launch', open: false, tasks: [] },
      ],
    };
    expect(parseQuickAdd('x @launch', later, DEFAULT_DISCIPLINES, null).epic?.id).toBe('b');
  });
  it('supports aliases, tags, codes and names without spaces', () => {
    expect(parse('x #design').d).toBe('UX');
    expect(parse('x #backend').d).toBe('BE');
    expect(parse('x #oth').d).toBe('OT');
    const discs = [...DEFAULT_DISCIPLINES, { code: 'dqa', tag: 'QA', name: 'QA & testing', hue: 200 }];
    expect(parse('x #qa', null, discs).d).toBe('dqa');
    expect(parse('x #qatesting', null, discs).d).toBe('dqa');
  });
  it('keeps unknown #words in the title and drops unmatched @words', () => {
    expect(parse('Fix #nope thing @zzz')).toMatchObject({ title: 'Fix #nope thing', d: 'OT' });
  });
  it('does not resolve inherited object keys as tags', () => {
    expect(parse('x #constructor')).toMatchObject({ title: 'x #constructor', d: 'OT' });
    expect(parse('x #__proto__')).toMatchObject({ title: 'x #__proto__', d: 'OT' });
    expect(parse('x #toString')).toMatchObject({ title: 'x #toString', d: 'OT' });
  });
  it('drops an alias whose discipline is missing', () => {
    const noUx = DEFAULT_DISCIPLINES.filter((x) => x.code !== 'UX');
    expect(parse('x #design', null, noUx)).toMatchObject({ title: 'x #design', d: 'OT' });
  });
  it('defaults d to the first discipline when OT is absent', () => {
    expect(parse('x', null, DEFAULT_DISCIPLINES.slice(0, 2)).d).toBe('FE');
  });
  it('lets the last discipline token win', () => {
    expect(parse('x #fe #be').d).toBe('BE');
  });
  it('defaults the epic to focus, then first incomplete with tasks, then first', () => {
    expect(parse('x', 'e3').epic?.id).toBe('e3');
    expect(parse('x').epic?.id).toBe('e2');
    const allDone: Project = { ...project, epics: [project.epics[0]] };
    expect(parseQuickAdd('x', allDone, DEFAULT_DISCIPLINES, null).epic?.id).toBe('e1');
  });
  it('treats an epic with 199 of 200 tasks done as incomplete', () => {
    const task = (i: number, s: 0 | 2) => ({ id: `t${i}`, title: 'x', d: 'FE', s, notes: '' });
    const almost: Project = {
      ...project,
      epics: [
        { id: 'a', name: 'Almost', open: true, tasks: Array.from({ length: 200 }, (_, i) => task(i, i ? 2 : 0)) },
        { id: 'b', name: 'Other', open: true, tasks: [task(0, 0)] },
      ],
    };
    expect(parseQuickAdd('x', almost, DEFAULT_DISCIPLINES, null).epic?.id).toBe('a');
  });
});

describe('hasQuickSyntax', () => {
  it('detects quick-add syntax', () => {
    expect(hasQuickSyntax('do it #fe')).toBe(true);
    expect(hasQuickSyntax('@bill')).toBe(true);
    expect(hasQuickSyntax('email@example')).toBe(false);
  });
});
