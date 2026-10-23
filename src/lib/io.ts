import { lookup } from './disciplines';
import { STATUS_LABELS, uid, type Data, type Discipline, type Epic, type Project, type Status, type Task } from './types';

export function exportJson(data: Data, now = new Date()): string {
  return JSON.stringify(
    { app: 'plot', version: 1, exported: now.toISOString(), disciplines: data.disciplines, projects: data.projects },
    null,
    2,
  );
}

// ponytail: cells starting with = + - @ are not escaped against spreadsheet formula injection
export function exportCsv(data: Data): string {
  const q = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const rows = [['project', 'epic', 'task', 'discipline', 'status', 'notes']];
  for (const p of data.projects)
    for (const e of p.epics)
      for (const t of e.tasks) rows.push([p.name, e.name, t.title, lookup(data.disciplines, t.d).name, STATUS_LABELS[t.s], t.notes]);
  return rows.map((r) => r.map(q).join(',')).join('\n');
}

export type ImportResult = { ok: true; projects: Project[]; disciplines?: Discipline[] } | { ok: false; error: string };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isName = (v: unknown): v is string => isStr(v) && v.trim() !== '';
const isStatus = (v: unknown): v is Status => v === 0 || v === 1 || v === 2;
const fail = (error: string): ImportResult => ({ ok: false, error });

export function parseImport(text: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return fail("That file isn't valid JSON.");
  }
  const list: unknown = Array.isArray(raw) ? raw : isObj(raw) ? raw.projects : undefined;
  if (!Array.isArray(list)) return fail("That file isn't a Plot export. Expected a projects list.");
  if (!list.length) return fail('This file has no projects.');

  const [pids, eids, tids] = [new Set<string>(), new Set<string>(), new Set<string>()];
  const repeats = (ids: Set<string>, id: string) => ids.size === ids.add(id).size;
  const projects: Project[] = [];
  for (const [pi, p] of list.entries()) {
    const at = `Project ${pi + 1}`;
    if (!isObj(p) || !isName(p.name) || !Array.isArray(p.epics)) return fail(`${at} needs a name and an epics list.`);
    const pid = isStr(p.id) ? p.id : uid();
    if (repeats(pids, pid)) return fail(`${at} repeats the id "${pid}".`);
    const epics: Epic[] = [];
    for (const [ei, e] of p.epics.entries()) {
      const eat = `${at}, epic ${ei + 1}`;
      if (!isObj(e) || !isName(e.name) || !Array.isArray(e.tasks)) return fail(`${eat} needs a name and a tasks list.`);
      const eid = isStr(e.id) ? e.id : uid();
      if (repeats(eids, eid)) return fail(`${eat} repeats the id "${eid}".`);
      const tasks: Task[] = [];
      for (const [ti, t] of e.tasks.entries()) {
        if (!isObj(t) || !isName(t.title) || !isStatus(t.s))
          return fail(`${eat}, task ${ti + 1} needs a title and a status of 0, 1 or 2.`);
        const tid = isStr(t.id) ? t.id : uid();
        if (repeats(tids, tid)) return fail(`${eat}, task ${ti + 1} repeats the id "${tid}".`);
        const task: Task = { id: tid, title: t.title, d: isStr(t.d) ? t.d : 'OT', s: t.s, notes: isStr(t.notes) ? t.notes : '' };
        if (t.comments !== undefined) {
          if (!Array.isArray(t.comments)) return fail(`${eat}, task ${ti + 1} has comments that aren't a list.`);
          task.comments = [];
          for (const [ci, c] of t.comments.entries()) {
            if (!isObj(c) || !isName(c.text) || !isStr(c.at)) return fail(`${eat}, task ${ti + 1}, comment ${ci + 1} needs text and a time.`);
            task.comments.push({ id: isStr(c.id) ? c.id : uid(), text: c.text, at: c.at, ...(isStr(c.edited) ? { edited: c.edited } : {}) });
          }
        }
        tasks.push(task);
      }
      epics.push({ id: eid, name: e.name, open: e.open === true, tasks });
    }
    projects.push({
      id: pid,
      name: p.name,
      desc: isStr(p.desc) ? p.desc : '',
      edited: isStr(p.edited) ? p.edited : undefined,
      updatedAt: isStr(p.updatedAt) ? p.updatedAt : undefined,
      epics,
    });
  }

  if (!isObj(raw) || raw.disciplines === undefined) return { ok: true, projects };
  if (!Array.isArray(raw.disciplines)) return fail('Disciplines must be a list.');
  const disciplines: Discipline[] = [];
  for (const [i, d] of raw.disciplines.entries()) {
    if (!isObj(d) || !isName(d.code) || !isName(d.tag) || !isName(d.name) || !(d.hue === null || typeof d.hue === 'number'))
      return fail(`Discipline ${i + 1} needs a code, tag, name and hue.`);
    if (disciplines.some((x) => x.code === d.code)) return fail(`Discipline ${i + 1} repeats the code "${d.code}".`);
    const tag = d.tag.toLowerCase();
    if (disciplines.some((x) => x.tag.toLowerCase() === tag)) return fail(`Discipline ${i + 1} repeats the tag "${d.tag}".`);
    disciplines.push({ code: d.code, tag: d.tag, name: d.name, hue: d.hue });
  }
  return { ok: true, projects, ...(disciplines.length ? { disciplines } : {}) };
}
