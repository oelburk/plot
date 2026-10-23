import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { genTag, nextHue, usageCount } from './lib/disciplines';
import {
  TODO, uid, type Data, type Detail, type Discipline, type Project, type Status, type Task, type ToggleStyle, type View,
} from './lib/types';
import sample from './sample-data.json';

export type Screen = 'home' | 'project' | 'settings';
export type Overlay = 'none' | 'new' | 'palette';
export type Drag = { kind: 'epic' | 'task'; id: string };
export type DropPos = 'before' | 'after' | 'in';

interface Prefs {
  view: View;
  detail: Detail;
  toggleStyle: ToggleStyle;
  showDisc: boolean;
  hideDone: boolean;
}
interface Ui {
  screen: Screen;
  pid: string | null;
  filter: string;
  focus: string | null;
  openTask: string | null;
  adding: string | null;
  addingEpic: boolean;
  overlay: Overlay;
  undo: { label: string; snapshot: Data; at: number; back?: string } | null;
  drag: Drag | null;
  dropAt: { id: string; pos: DropPos } | null;
}
interface Actions {
  patch: (p: Partial<Prefs & Ui>) => void;
  go: (screen: Screen, pid?: string) => void;
  addTask: (epicId: string, title: string, d: string, projectId?: string) => void;
  setStatus: (taskId: string, s: Status) => void;
  updateTask: (taskId: string, patch: Partial<Pick<Task, 'title' | 'd' | 'notes'>>) => void;
  deleteTask: (taskId: string) => void;
  moveTask: (taskId: string, epicId: string, index: number) => void;
  addComment: (taskId: string, text: string) => void;
  editComment: (taskId: string, commentId: string, text: string) => void;
  deleteComment: (taskId: string, commentId: string) => void;
  addEpic: (name: string) => void;
  moveEpic: (epicId: string, index: number) => void;
  renameEpic: (epicId: string, name: string) => void;
  deleteEpic: (epicId: string) => void;
  toggleEpic: (epicId: string) => void;
  setAllOpen: (open: boolean) => void;
  createProject: (name: string, desc: string, epicNames: string[]) => void;
  renameProject: (id: string, name: string) => void;
  deleteProject: (id: string) => void;
  addDiscipline: (name: string) => void;
  updateDiscipline: (code: string, patch: Partial<Omit<Discipline, 'code'>>) => void;
  removeDiscipline: (code: string) => void;
  replaceData: (projects: Project[], disciplines?: Discipline[]) => void;
  reset: () => void;
  undoDelete: () => void;
  dismissUndo: () => void;
}
export type State = Data & Prefs & Ui & Actions;

const seed = () => structuredClone({ projects: sample.projects, disciplines: sample.disciplines }) as Data;

export const currentProject = (s: Pick<State, 'projects' | 'pid'>): Project | undefined =>
  s.projects.find((p) => p.id === s.pid) ?? s.projects[0];

const findTask = (p: Project, id: string) => p.epics.flatMap((e) => e.tasks).find((t) => t.id === id);
const findEpic = (p: Project, id: string) => p.epics.find((e) => e.id === id);
const cleared = { focus: null, openTask: null, adding: null, addingEpic: false };

export const useStore = create<State>()(
  persist(
    (set, get) => {
      const pid = () => currentProject(get())?.id ?? null;

      // ponytail: full clone per change; fine at this data size, switch to immer if it grows
      const edit = (s: Data, fn: (d: Data) => void, touch: string | null): Data => {
        const d = structuredClone({ projects: s.projects, disciplines: s.disciplines });
        fn(d);
        const p = d.projects.find((x) => x.id === touch);
        if (p) p.updatedAt = new Date().toISOString();
        return d;
      };
      const mutate = (fn: (d: Data) => void, touch: string | null) => set((s) => edit(s, fn, touch));

      const editProject = (s: State, fn: (p: Project) => void, touch = true): Data => {
        const id = currentProject(s)?.id ?? null;
        return edit(
          s,
          (d) => {
            const p = d.projects.find((x) => x.id === id);
            if (p) fn(p);
          },
          touch ? id : null,
        );
      };
      const inProject = (fn: (p: Project) => void, touch = true) => set((s) => editProject(s, fn, touch));

      // ponytail: undo restores the whole pre-delete snapshot, so edits made before Undo are rolled back too
      // back is the project Undo returns to, for a delete that sent the user Home
      const withUndo = (label: string, next: (s: State) => Partial<State>, back?: string) =>
        set((s) => ({ ...next(s), undo: { label, snapshot: { projects: s.projects, disciplines: s.disciplines }, at: Date.now(), back } }));

      return {
        ...seed(),
        view: 'tree',
        detail: 'bar',
        toggleStyle: 'labels',
        showDisc: true,
        hideDone: false,
        screen: 'project',
        pid: null,
        filter: 'all',
        ...cleared,
        overlay: 'none',
        undo: null,
        drag: null,
        dropAt: null,

        patch: (p) => set(p),
        go: (screen, id) => set({ screen, overlay: 'none', ...cleared, ...(id ? { pid: id, filter: 'all' } : {}) }),

        addTask: (epicId, title, d, projectId) => {
          const id = projectId ?? pid();
          mutate((data) => {
            const epic = data.projects.find((p) => p.id === id)?.epics.find((e) => e.id === epicId);
            if (!epic) return;
            epic.open = true;
            epic.tasks.push({ id: uid(), title: title.trim(), d, s: TODO, notes: '' });
          }, id);
        },
        setStatus: (taskId, s) =>
          inProject((p) => {
            const t = findTask(p, taskId);
            if (t) t.s = s;
          }),
        updateTask: (taskId, patch) => {
          if (patch.title !== undefined) {
            const title = patch.title.trim();
            if (!title) return;
            patch = { ...patch, title };
          }
          inProject((p) => {
            const t = findTask(p, taskId);
            if (t) Object.assign(t, patch);
          });
        },
        deleteTask: (taskId) => {
          const p = currentProject(get());
          const t = p && findTask(p, taskId);
          if (!t) return;
          withUndo(`Deleted "${t.title}"`, (s) => ({
            ...editProject(s, (p) => p.epics.forEach((e) => (e.tasks = e.tasks.filter((x) => x.id !== taskId)))),
            openTask: null,
          }));
        },
        moveTask: (taskId, epicId, index) =>
          inProject((p) => {
            const from = p.epics.find((e) => e.tasks.some((t) => t.id === taskId));
            const to = findEpic(p, epicId);
            if (!from || !to) return;
            to.tasks.splice(index, 0, ...from.tasks.splice(from.tasks.findIndex((t) => t.id === taskId), 1));
            to.open = true;
          }),
        addComment: (taskId, text) => {
          if (!text.trim()) return;
          inProject((p) => {
            const t = findTask(p, taskId);
            if (t) (t.comments ??= []).push({ id: uid(), text: text.trim(), at: new Date().toISOString() });
          });
        },
        editComment: (taskId, commentId, text) => {
          if (!text.trim()) return;
          inProject((p) => {
            const c = findTask(p, taskId)?.comments?.find((x) => x.id === commentId);
            if (!c || c.text === text.trim()) return;
            c.text = text.trim();
            c.edited = new Date().toISOString();
          });
        },
        deleteComment: (taskId, commentId) =>
          withUndo('Deleted comment', (s) =>
            editProject(s, (p) => {
              const t = findTask(p, taskId);
              if (t?.comments) t.comments = t.comments.filter((x) => x.id !== commentId);
            }),
          ),

        addEpic: (name) => {
          if (!name.trim()) return;
          inProject((p) => void p.epics.push({ id: uid(), name: name.trim(), open: true, tasks: [] }));
        },
        moveEpic: (epicId, index) =>
          inProject((p) => {
            const i = p.epics.findIndex((e) => e.id === epicId);
            if (i >= 0) p.epics.splice(index, 0, ...p.epics.splice(i, 1));
          }),
        renameEpic: (epicId, name) => {
          if (!name.trim()) return;
          inProject((p) => {
            const e = findEpic(p, epicId);
            if (e) e.name = name.trim();
          });
        },
        deleteEpic: (epicId) => {
          const p = currentProject(get());
          const e = p && findEpic(p, epicId);
          if (!e) return;
          withUndo(`Deleted "${e.name}"`, (s) => ({
            ...editProject(s, (p) => (p.epics = p.epics.filter((x) => x.id !== epicId))),
            ...cleared,
          }));
        },
        toggleEpic: (epicId) =>
          inProject((p) => {
            const e = findEpic(p, epicId);
            if (e) e.open = !e.open;
          }, false),
        setAllOpen: (open) => inProject((p) => p.epics.forEach((e) => (e.open = open)), false),

        createProject: (name, desc, epicNames) => {
          const project: Project = {
            id: uid(),
            name: name.trim() || 'Untitled project',
            desc: desc.trim(),
            epics: epicNames
              .map((n) => n.trim())
              .filter(Boolean)
              .map((n) => ({ id: uid(), name: n, open: true, tasks: [] })),
          };
          mutate((d) => void d.projects.unshift(project), project.id);
          const first = project.epics[0]?.id ?? null;
          set({ screen: 'project', pid: project.id, filter: 'all', overlay: 'none', openTask: null, focus: first, adding: first, addingEpic: !first });
        },
        renameProject: (id, name) => {
          if (!name.trim()) return;
          mutate((d) => {
            const p = d.projects.find((x) => x.id === id);
            if (p) p.name = name.trim();
          }, id);
        },
        deleteProject: (id) => {
          const p = get().projects.find((x) => x.id === id);
          if (!p) return;
          const leaves = (s: State) => s.screen === 'project' && currentProject(s)?.id === id;
          withUndo(
            `Deleted "${p.name}"`,
            (s) => ({
              ...edit(s, (d) => (d.projects = d.projects.filter((x) => x.id !== id)), null),
              ...(leaves(s) ? { screen: 'home' as const, pid: null, ...cleared } : {}),
            }),
            leaves(get()) ? id : undefined,
          );
        },

        addDiscipline: (name) => {
          const n = name.trim();
          if (!n) return;
          mutate((d) => {
            const disc: Discipline = {
              code: 'd' + uid(),
              tag: genTag(n, d.disciplines.map((x) => x.tag)),
              name: n,
              hue: nextHue(d.disciplines.map((x) => x.hue)),
            };
            const other = d.disciplines.findIndex((x) => x.code === 'OT');
            d.disciplines.splice(other < 0 ? d.disciplines.length : other, 0, disc);
          }, null);
        },
        updateDiscipline: (code, patch) => {
          const { disciplines } = get();
          const { name, tag } = patch;
          if (name !== undefined && !name.trim()) return;
          if (tag !== undefined && (!tag.trim() || disciplines.some((x) => x.code !== code && x.tag.toLowerCase() === tag.toLowerCase())))
            return;
          mutate((d) => {
            const x = d.disciplines.find((y) => y.code === code);
            if (x) Object.assign(x, patch);
          }, null);
        },
        removeDiscipline: (code) => {
          const { projects, disciplines, filter } = get();
          if (disciplines.length < 2 || usageCount(projects, code) > 0) return;
          mutate((d) => (d.disciplines = d.disciplines.filter((x) => x.code !== code)), null);
          if (filter === code) set({ filter: 'all' });
        },

        replaceData: (projects, disciplines) =>
          set({ projects, ...(disciplines ? { disciplines } : {}), pid: null, filter: 'all', ...cleared, undo: null }),
        reset: () => set({ ...seed(), screen: 'home', pid: null, filter: 'all', ...cleared, undo: null }),
        undoDelete: () => {
          const u = get().undo;
          if (u) set({ ...u.snapshot, undo: null, ...(u.back ? { screen: 'project' as const, pid: u.back, filter: 'all', ...cleared } : {}) });
        },
        dismissUndo: () => set({ undo: null }),
      };
    },
    {
      name: 'plot.v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ projects, disciplines, view, detail, toggleStyle, showDisc, hideDone }) => ({
        projects, disciplines, view, detail, toggleStyle, showDisc, hideDone,
      }),
    },
  ),
);
