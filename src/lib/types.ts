export const TODO = 0;
export const DOING = 1;
export const DONE = 2;
export type Status = typeof TODO | typeof DOING | typeof DONE;
export const STATUS_LABELS = ['Not started', 'In progress', 'Done'] as const;

export interface Discipline {
  code: string;
  tag: string;
  name: string;
  hue: number | null;
}
export interface TaskComment {
  id: string;
  text: string;
  at: string;
  edited?: string;
}
export interface Task {
  id: string;
  title: string;
  d: string;
  s: Status;
  notes: string;
  comments?: TaskComment[];
}
export interface Epic {
  id: string;
  name: string;
  open: boolean;
  tasks: Task[];
}
/** One line in a project's history: `{verb} {name} {to}`, e.g. Marked "Login form" as done. */
export interface Activity {
  id: string;
  at: string;
  verb: string;
  name: string;
  to?: string;
  s?: Status;
}
export interface Project {
  id: string;
  name: string;
  desc: string;
  edited?: string;
  updatedAt?: string;
  epics: Epic[];
  history?: Activity[];
}
export interface Data {
  projects: Project[];
  disciplines: Discipline[];
}

export type View = 'tree' | 'map';
export type Detail = 'bar' | 'squares' | 'grouped';
export type ToggleStyle = 'labels' | 'glyphs';

// ponytail: 8 hex chars (32 bits); collisions are possible, though unlikely at this data size
// getRandomValues, unlike randomUUID, needs no secure context
export const uid = () => [...crypto.getRandomValues(new Uint8Array(4))].map((b) => b.toString(16).padStart(2, '0')).join('');
