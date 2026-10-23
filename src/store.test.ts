import { beforeEach, expect, it } from 'vitest';
import { DOING } from './lib/types';
import { currentProject, useStore } from './store';

const st = () => useStore.getState();
const project = () => currentProject(st())!;

beforeEach(() => st().reset());

it('seeds the sample data', () => {
  expect(st().projects).toHaveLength(4);
  expect(st().disciplines.map((d) => d.code)).toEqual(['FE', 'BE', 'UX', 'OT']);
});

it('adding a task trims it, opens its epic and bumps updatedAt', () => {
  const epic = project().epics.find((e) => !e.open)!;
  st().addTask(epic.id, '  Write docs ', 'FE');
  const after = project().epics.find((e) => e.id === epic.id)!;
  expect(after.open).toBe(true);
  expect(after.tasks.at(-1)).toMatchObject({ title: 'Write docs', d: 'FE', s: 0, notes: '' });
  expect(project().updatedAt).toBeTypeOf('string');
});

it('toggling an epic or expanding all does not bump updatedAt', () => {
  st().toggleEpic(project().epics[0].id);
  st().setAllOpen(true);
  expect(project().updatedAt).toBeUndefined();
  expect(project().epics.every((e) => e.open)).toBe(true);
});

it('setting a status bumps updatedAt', () => {
  const t = project().epics[0].tasks[0];
  st().setStatus(t.id, DOING);
  expect(project().epics[0].tasks[0].s).toBe(DOING);
  expect(project().updatedAt).toBeTypeOf('string');
});

it('inserts new disciplines before Other with a generated tag and the next hue', () => {
  st().addDiscipline('Data');
  expect(st().disciplines.map((d) => d.tag)).toEqual(['FE', 'BE', 'UX', 'DAT', 'OTH']);
  expect(st().disciplines[3].hue).toBe(200);
  st().addDiscipline('QA');
  expect(st().disciplines[4]).toMatchObject({ tag: 'QA', hue: 340 });
});

it('removes a discipline only when unused and not the last one', () => {
  st().removeDiscipline('FE');
  expect(st().disciplines.some((d) => d.code === 'FE')).toBe(true);
  st().addDiscipline('QA');
  const qa = st().disciplines.find((d) => d.name === 'QA')!;
  st().removeDiscipline(qa.code);
  expect(st().disciplines.some((d) => d.code === qa.code)).toBe(false);
  useStore.setState({ projects: [], disciplines: [st().disciplines[0]] });
  st().removeDiscipline(st().disciplines[0].code);
  expect(st().disciplines).toHaveLength(1);
});

it('deleting an epic can be undone', () => {
  const epic = project().epics[1];
  st().deleteEpic(epic.id);
  expect(project().epics.some((e) => e.id === epic.id)).toBe(false);
  expect(st().undo?.label).toBe(`Deleted "${epic.name}"`);
  st().undoDelete();
  expect(project().epics[1].id).toBe(epic.id);
  expect(st().undo).toBeNull();
});

it('deleting the open project goes home and can be undone', () => {
  const p = project();
  st().go('project', p.id);
  st().deleteProject(p.id);
  expect(st().screen).toBe('home');
  expect(st().projects.some((x) => x.id === p.id)).toBe(false);
  st().undoDelete();
  expect(st().projects[0].id).toBe(p.id);
});

it('undoing a delete that sent you home returns to that project', () => {
  const p = project();
  st().go('project', p.id);
  st().deleteProject(p.id);
  st().undoDelete();
  expect(st()).toMatchObject({ screen: 'project', pid: p.id });
});

it('labels a project delete in the undo toast', () => {
  const p = project();
  st().deleteProject(p.id);
  expect(st().undo?.label).toBe(`Deleted "${p.name}"`);
});

it('deleting a project other than the current one stays put', () => {
  const current = project();
  const other = st().projects[1];
  st().go('project', current.id);
  st().deleteProject(other.id);
  expect(st()).toMatchObject({ screen: 'project', pid: current.id });
  expect(st().projects.some((x) => x.id === other.id)).toBe(false);
  st().undoDelete();
  expect(st().projects.some((x) => x.id === other.id)).toBe(true);
});

it('deleting the current project from Settings stays on Settings', () => {
  const p = project();
  st().go('settings');
  st().deleteProject(p.id);
  expect(st().screen).toBe('settings');
});

it('deleting a task can be undone', () => {
  const before = st().projects;
  const t = project().epics[0].tasks[0];
  st().patch({ openTask: t.id });
  st().deleteTask(t.id);
  expect(project().epics[0].tasks.some((x) => x.id === t.id)).toBe(false);
  expect(st()).toMatchObject({ openTask: null, undo: { label: `Deleted "${t.title}"` } });
  st().undoDelete();
  expect(st().projects).toEqual(before);
  expect(st().undo).toBeNull();
});

it('renaming a task trims it and ignores blanks', () => {
  const t = project().epics[0].tasks[0];
  st().updateTask(t.id, { title: '  ' });
  expect(project().epics[0].tasks[0].title).toBe(t.title);
  st().updateTask(t.id, { title: ' Renamed ' });
  expect(project().epics[0].tasks[0].title).toBe('Renamed');
});

it('moves an epic to a new position', () => {
  const ids = project().epics.map((e) => e.id);
  st().moveEpic(ids[0], 2);
  expect(project().epics.map((e) => e.id)).toEqual([ids[1], ids[2], ids[0], ...ids.slice(3)]);
});

it('moves a task within its epic and into another epic, opening it', () => {
  const [a, b] = project().epics;
  const ids = a.tasks.map((t) => t.id);
  st().moveTask(ids[0], a.id, 1);
  expect(project().epics[0].tasks.map((t) => t.id)).toEqual([ids[1], ids[0], ...ids.slice(2)]);
  if (project().epics[1].open) st().toggleEpic(b.id);
  st().moveTask(ids[0], b.id, 0);
  expect(project().epics[0].tasks.some((t) => t.id === ids[0])).toBe(false);
  expect(project().epics[1].tasks[0].id).toBe(ids[0]);
  expect(project().epics[1].open).toBe(true);
});

it('adds, edits and deletes comments, with undo for deletes', () => {
  const t = project().epics[0].tasks[0];
  const comments = () => project().epics[0].tasks[0].comments ?? [];
  st().addComment(t.id, '   ');
  expect(comments()).toHaveLength(0);
  st().addComment(t.id, ' First update ');
  const [c] = comments();
  expect(c).toMatchObject({ text: 'First update' });
  expect(c.at).toBeTypeOf('string');
  expect(c.edited).toBeUndefined();
  st().editComment(t.id, c.id, 'First update');
  expect(comments()[0].edited).toBeUndefined();
  st().editComment(t.id, c.id, ' Changed ');
  expect(comments()[0]).toMatchObject({ text: 'Changed', edited: expect.any(String) });
  st().deleteComment(t.id, c.id);
  expect(comments()).toHaveLength(0);
  expect(st().undo?.label).toBe('Deleted comment');
  st().undoDelete();
  expect(comments()[0].text).toBe('Changed');
});

it('reset reseeds the data and goes home', () => {
  st().renameProject(project().id, 'Changed');
  st().go('settings');
  st().reset();
  expect(st()).toMatchObject({ screen: 'home', pid: null, undo: null });
  expect(st().projects[0].name).not.toBe('Changed');
});

it('replaceData keeps the disciplines when none are passed', () => {
  const discs = st().disciplines;
  st().replaceData([]);
  expect(st().projects).toEqual([]);
  expect(st().disciplines).toEqual(discs);
  const one = [{ code: 'X', tag: 'X', name: 'X', hue: null }];
  st().replaceData([], one);
  expect(st().disciplines).toEqual(one);
});

it('removing a discipline resets a filter on it', () => {
  st().addDiscipline('QA');
  const qa = st().disciplines.find((d) => d.name === 'QA')!;
  st().patch({ filter: qa.code });
  st().removeDiscipline(qa.code);
  expect(st().filter).toBe('all');
});

it('persists data and prefs but not UI or undo state', () => {
  st().patch({ filter: 'BE', hideDone: true });
  st().deleteEpic(project().epics[0].id);
  const saved = JSON.parse(localStorage.getItem('plot.v1')!).state;
  expect(Object.keys(saved).sort()).toEqual(['detail', 'disciplines', 'hideDone', 'projects', 'showDisc', 'toggleStyle', 'view']);
  expect(saved.hideDone).toBe(true);
});

it('creating a project puts it first and opens add-task on its first epic', () => {
  st().createProject(' Partner API ', '', ['Discovery', 'Docs']);
  const p = st().projects[0];
  expect(p.name).toBe('Partner API');
  expect(st()).toMatchObject({ pid: p.id, screen: 'project', adding: p.epics[0].id, addingEpic: false });
});

it('creating a project without epics opens add-epic', () => {
  st().createProject('Solo', '', []);
  expect(st()).toMatchObject({ addingEpic: true, adding: null });
});

it('ignores blank renames', () => {
  const p = project();
  st().renameProject(p.id, '   ');
  expect(project().name).toBe(p.name);
  st().renameProject(p.id, ' Atlas ');
  expect(project().name).toBe('Atlas');
});

it('ignores blank epic names', () => {
  const n = project().epics.length;
  st().addEpic('   ');
  expect(project().epics).toHaveLength(n);
  st().addEpic(' Launch ');
  expect(project().epics.at(-1)?.name).toBe('Launch');
});

it('creating a project drops blank epic names and trims the rest', () => {
  st().createProject('P', '', [' Discovery ', '  ', '']);
  expect(st().projects[0].epics.map((e) => e.name)).toEqual(['Discovery']);
  st().createProject('Q', '', ['', ' ']);
  expect(st()).toMatchObject({ addingEpic: true, adding: null });
});

it('ignores discipline edits that leave an empty name or tag', () => {
  const before = st().disciplines;
  st().updateDiscipline('FE', { name: '  ' });
  st().updateDiscipline('FE', { tag: '' });
  expect(st().disciplines).toEqual(before);
  st().updateDiscipline('FE', { name: 'Front end', tag: 'FRN' });
  expect(st().disciplines[0]).toMatchObject({ name: 'Front end', tag: 'FRN' });
});

it('ignores a discipline tag already used by another, ignoring case', () => {
  const before = st().disciplines;
  st().updateDiscipline('FE', { tag: 'be' });
  expect(st().disciplines).toEqual(before);
  st().updateDiscipline('FE', { tag: 'fe', hue: 110 });
  expect(st().disciplines[0]).toMatchObject({ tag: 'fe', hue: 110 });
});
