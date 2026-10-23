import { describe, expect, it } from 'vitest';
import sample from '../sample-data.json';
import { exportCsv, exportJson, parseImport } from './io';
import type { Data } from './types';

const data: Data = {
  disciplines: [{ code: 'FE', tag: 'FE', name: 'Frontend', hue: 250 }],
  projects: [
    {
      id: 'p', name: 'P', desc: 'D',
      epics: [{ id: 'e', name: 'E', open: true, tasks: [{ id: 't', title: 'Say "hi", ok', d: 'FE', s: 1, notes: 'line\nbreak' }] }],
    },
  ],
};

it('exports CSV with names, labels and quoting', () => {
  expect(exportCsv(data)).toBe(
    '"project","epic","task","discipline","status","notes"\n"P","E","Say ""hi"", ok","Frontend","In progress","line\nbreak"',
  );
});

it('exports JSON in the handoff format', () => {
  const out = JSON.parse(exportJson(data, new Date('2026-10-21T10:00:00Z')));
  expect(out).toEqual({ app: 'plot', version: 1, exported: '2026-10-21T10:00:00.000Z', disciplines: data.disciplines, projects: data.projects });
});

describe('parseImport', () => {
  it('round-trips an export', () => {
    const r = parseImport(exportJson(data));
    expect(r).toEqual({ ok: true, projects: data.projects, disciplines: data.disciplines });
  });
  it('reads the sample data', () => {
    const r = parseImport(JSON.stringify(sample));
    if (!r.ok) throw new Error(r.error);
    expect(r.projects).toHaveLength(4);
    expect(r.projects.flatMap((p) => p.epics.flatMap((e) => e.tasks))).toHaveLength(79);
    expect(r.disciplines).toHaveLength(4);
  });
  it('accepts a bare projects array and fills defaults', () => {
    const r = parseImport(JSON.stringify([{ name: 'X', epics: [{ name: 'E', tasks: [{ title: 'T', s: 0 }] }] }]));
    if (!r.ok) throw new Error(r.error);
    const p = r.projects[0];
    expect(p).toMatchObject({ name: 'X', desc: '' });
    expect(p.id).toBeTypeOf('string');
    expect(p.epics[0]).toMatchObject({ name: 'E', open: false });
    expect(p.epics[0].tasks[0]).toMatchObject({ title: 'T', s: 0, d: 'OT', notes: '' });
    expect(r.disciplines).toBeUndefined();
  });
  it('reads task comments and rejects malformed ones', () => {
    const file = (comments: unknown) => JSON.stringify([{ name: 'P', epics: [{ name: 'E', tasks: [{ title: 'T', s: 0, comments }] }] }]);
    const r = parseImport(file([{ id: 'c', text: 'Hi', at: '2026-10-22T10:00:00Z', edited: '2026-10-22T11:00:00Z' }, { text: 'Two', at: 'x' }]));
    if (!r.ok) throw new Error(r.error);
    const [a, b] = r.projects[0].epics[0].tasks[0].comments!;
    expect(a).toEqual({ id: 'c', text: 'Hi', at: '2026-10-22T10:00:00Z', edited: '2026-10-22T11:00:00Z' });
    expect(b).toMatchObject({ text: 'Two', at: 'x' });
    expect(b.id).toBeTypeOf('string');
    expect(parseImport(file('nope'))).toEqual({ ok: false, error: "Project 1, epic 1, task 1 has comments that aren't a list." });
    expect(parseImport(file([{ text: '' , at: 'x' }]))).toEqual({ ok: false, error: 'Project 1, epic 1, task 1, comment 1 needs text and a time.' });
  });
  it('rejects bad input with a specific message', () => {
    expect(parseImport('nope')).toEqual({ ok: false, error: "That file isn't valid JSON." });
    expect(parseImport('{"foo":1}')).toEqual({ ok: false, error: "That file isn't a Plot export. Expected a projects list." });
    expect(parseImport('[{"epics":[]}]')).toEqual({ ok: false, error: 'Project 1 needs a name and an epics list.' });
    expect(parseImport('[{"name":"P","epics":[{"name":"E","tasks":[{"title":"T","s":3}]}]}]')).toEqual({
      ok: false,
      error: 'Project 1, epic 1, task 1 needs a title and a status of 0, 1 or 2.',
    });
    expect(parseImport('{"projects":[{"name":"P","epics":[]}],"disciplines":[{"code":"FE"}]}')).toEqual({
      ok: false,
      error: 'Discipline 1 needs a code, tag, name and hue.',
    });
  });
  it('rejects an epic without a tasks list', () => {
    expect(parseImport('[{"name":"P","epics":[{"name":"E"}]}]')).toEqual({
      ok: false,
      error: 'Project 1, epic 1 needs a name and a tasks list.',
    });
  });
  it('rejects null entries', () => {
    expect(parseImport('[null]')).toMatchObject({ ok: false, error: 'Project 1 needs a name and an epics list.' });
    expect(parseImport('[{"name":"P","epics":[null]}]')).toMatchObject({ ok: false, error: 'Project 1, epic 1 needs a name and a tasks list.' });
    expect(parseImport('[{"name":"P","epics":[{"name":"E","tasks":[null]}]}]')).toMatchObject({
      ok: false,
      error: 'Project 1, epic 1, task 1 needs a title and a status of 0, 1 or 2.',
    });
  });
  it('rejects a string status', () => {
    expect(parseImport('[{"name":"P","epics":[{"name":"E","tasks":[{"title":"T","s":"1"}]}]}]')).toMatchObject({
      ok: false,
      error: 'Project 1, epic 1, task 1 needs a title and a status of 0, 1 or 2.',
    });
  });
  it('rejects empty names and titles', () => {
    expect(parseImport('[{"name":" ","epics":[]}]')).toMatchObject({ ok: false, error: 'Project 1 needs a name and an epics list.' });
    expect(parseImport('[{"name":"P","epics":[{"name":"","tasks":[]}]}]')).toMatchObject({ ok: false, error: 'Project 1, epic 1 needs a name and a tasks list.' });
    expect(parseImport('[{"name":"P","epics":[{"name":"E","tasks":[{"title":"","s":0}]}]}]')).toMatchObject({
      ok: false,
      error: 'Project 1, epic 1, task 1 needs a title and a status of 0, 1 or 2.',
    });
    expect(parseImport('{"projects":[{"name":"P","epics":[]}],"disciplines":[{"code":"FE","tag":"FE","name":" ","hue":1}]}')).toMatchObject({
      ok: false,
      error: 'Discipline 1 needs a code, tag, name and hue.',
    });
  });
  it('rejects duplicate ids and discipline codes', () => {
    expect(parseImport('[{"id":"a","name":"P","epics":[]},{"id":"a","name":"Q","epics":[]}]')).toEqual({
      ok: false,
      error: 'Project 2 repeats the id "a".',
    });
    expect(parseImport('[{"name":"P","epics":[{"id":"e","name":"A","tasks":[]},{"id":"e","name":"B","tasks":[]}]}]')).toEqual({
      ok: false,
      error: 'Project 1, epic 2 repeats the id "e".',
    });
    expect(parseImport('[{"name":"P","epics":[{"name":"A","tasks":[{"id":"t","title":"x","s":0},{"id":"t","title":"y","s":0}]}]}]')).toEqual({
      ok: false,
      error: 'Project 1, epic 1, task 2 repeats the id "t".',
    });
    const d = '{"code":"FE","tag":"FE","name":"Frontend","hue":250}';
    expect(parseImport(`{"projects":[{"name":"P","epics":[]}],"disciplines":[${d},${d}]}`)).toEqual({
      ok: false,
      error: 'Discipline 2 repeats the code "FE".',
    });
  });
  it('rejects duplicate discipline tags, ignoring case', () => {
    const d = (code: string, tag: string) => `{"code":"${code}","tag":"${tag}","name":"N","hue":null}`;
    expect(parseImport(`{"projects":[{"name":"P","epics":[]}],"disciplines":[${d('A', 'UX')},${d('B', 'ux')}]}`)).toEqual({
      ok: false,
      error: 'Discipline 2 repeats the tag "ux".',
    });
  });
  it('rejects disciplines that are not a list', () => {
    expect(parseImport('{"projects":[{"name":"P","epics":[]}],"disciplines":{"FE":1}}')).toEqual({ ok: false, error: 'Disciplines must be a list.' });
  });
  it('rejects an empty project list', () => {
    expect(parseImport('[]')).toEqual({ ok: false, error: 'This file has no projects.' });
    expect(parseImport('{"projects":[]}')).toEqual({ ok: false, error: 'This file has no projects.' });
  });
  it('keeps only the known discipline fields', () => {
    const r = parseImport('{"projects":[{"name":"P","epics":[]}],"disciplines":[{"code":"FE","tag":"FE","name":"Frontend","hue":null,"x":1}]}');
    expect(r).toMatchObject({ ok: true, disciplines: [{ code: 'FE', tag: 'FE', name: 'Frontend', hue: null }] });
    expect(r.ok && Object.keys(r.disciplines![0])).toEqual(['code', 'tag', 'name', 'hue']);
  });
});
