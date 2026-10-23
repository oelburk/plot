import { Pct } from '../components/ui';
import { editedLabel, plural } from '../lib/format';
import { allTasks, isComplete, stats } from '../lib/progress';
import { DONE, type Project } from '../lib/types';
import { useStore } from '../store';

export function Home() {
  const projects = useStore((s) => s.projects);
  const { go, patch } = useStore.getState();
  const tasks = projects.flatMap(allTasks);
  const done = tasks.filter((t) => t.s === DONE).length;
  const openNew = () => patch({ overlay: 'new' });

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="mx-auto max-w-1080 px-36 pb-72 pt-44">
        <div data-tauri-drag-region className="flex flex-wrap items-end justify-between gap-16">
          <div className="flex flex-col gap-6">
            <h1 tabIndex={-1} className="text-26 font-semibold leading-[1.15] tracking-[-0.025em] outline-none">Projects</h1>
            <span className="text-13 text-muted">
              {plural(projects.length, 'project')} · {plural(tasks.length, 'task')} · {done} done
            </span>
          </div>
          <button type="button" onClick={openNew} className="rounded-8 bg-fg px-14 py-8 text-13 font-medium text-app hover:bg-white">
            New project
          </button>
        </div>

        <div className="mt-28 grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-14">
          {projects.map((p) => (
            <ProjectCard key={p.id} p={p} onOpen={() => go('project', p.id)} />
          ))}
          <button
            type="button"
            onClick={openNew}
            className="flex min-h-200 flex-col items-start justify-center gap-6 rounded-16 border border-dashed border-white/12 p-20 text-left text-secondary hover:border-white/24 hover:text-fg"
          >
            <span className="text-15 font-medium">+ New project</span>
            <span className="text-12.5 text-faint">Name it, list a few epics, go.</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function ProjectCard({ p, onOpen }: { p: Project; onOpen: () => void }) {
  const st = stats(allTasks(p));
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-col gap-20 rounded-16 border border-white/6 bg-card p-20 text-left transition-[border-color] duration-150 hover:border-white/16"
    >
      <div className="flex w-full items-start justify-between gap-16">
        <div className="flex min-w-0 flex-col gap-5">
          <span className="text-15 font-semibold tracking-[-0.015em]">{p.name}</span>
          <span className="text-pretty text-12.5 leading-[1.45] text-muted">{p.desc || 'No description'}</span>
        </div>
        <Pct value={st.pct} complete={isComplete(st)} className="text-30 leading-none" unitClass="text-14" />
      </div>
      <div className="flex w-full flex-col gap-7">
        <div className="flex h-38 items-end gap-4">
          {p.epics.map((e) => {
            const es = stats(e.tasks);
            return (
              <span key={e.id} title={`${e.name} · ${es.pct}%`} className="flex h-full flex-1 flex-col justify-end overflow-hidden rounded-4 bg-white/5">
                <span className={isComplete(es) ? 'bg-done' : 'bg-done/60'} style={{ height: `${es.pct}%` }} />
              </span>
            );
          })}
        </div>
        <span className="font-mono text-10 font-medium tracking-[0.06em] text-index">EPICS</span>
      </div>
      <div className="flex w-full justify-between gap-12 border-t border-white/5 pt-14 text-12 text-muted">
        <span>
          {plural(p.epics.length, 'epic')} · {plural(st.total, 'task')}
        </span>
        <span>Edited {editedLabel(p)}</span>
      </div>
    </button>
  );
}
