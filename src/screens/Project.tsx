import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { InlineEdit } from '../components/InlineEdit';
import { Menu } from '../components/Menu';
import { btn, DisciplineTag, Pct, Segmented, StackedBar, Switch } from '../components/ui';
import { discColor } from '../lib/disciplines';
import { focusUndo } from '../lib/focus';
import { allTasks, stats } from '../lib/progress';
import type { Project, Task } from '../lib/types';
import { currentProject, useStore } from '../store';
import { EpicPanel, MapView } from './MapView';
import { Tree } from './Tree';

export function ProjectScreen() {
  const p = useStore(currentProject);
  const view = useStore((s) => s.view);
  const focus = useStore((s) => s.focus);
  if (!p) return null;
  const tasks = allTasks(p);
  const focusIndex = p.epics.findIndex((e) => e.id === focus);

  return (
    <div className="flex min-h-0 flex-1">
      <div className="min-w-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-1040 px-36 pb-72 pt-20">
          <TopBar p={p} />
          <Title key={p.id} p={p} />
          <ProgressCard p={p} tasks={tasks} />
          <Toolbar tasks={tasks} />
          {view === 'map' ? <MapView p={p} /> : <Tree p={p} />}
        </div>
      </div>
      {view === 'map' && focusIndex >= 0 && <EpicPanel key={focus} epic={p.epics[focusIndex]} index={focusIndex} />}
    </div>
  );
}

const TreeIcon = () => (
  <span className="flex w-11 flex-col gap-2">
    <span className="h-[1.5px] w-7 bg-current" />
    <span className="ml-3 h-[1.5px] w-8 bg-current" />
    <span className="ml-3 h-[1.5px] w-8 bg-current" />
  </span>
);

const MapIcon = () => (
  <span className="grid grid-cols-[4px_4px] gap-2">
    {[1, 1, 1, 0.4].map((o, i) => (
      <span key={i} className="size-4 rounded-1 bg-current" style={{ opacity: o }} />
    ))}
  </span>
);

function TopBar({ p }: { p: Project }) {
  const view = useStore((s) => s.view);
  const { go, patch } = useStore.getState();
  return (
    <div data-tauri-drag-region className="flex flex-wrap items-center justify-between gap-16">
      <div className="flex min-w-0 items-center gap-8 text-12.5 text-muted">
        <button type="button" onClick={() => go('home')} className="hover:text-fg">
          Projects
        </button>
        <span className="text-sep">/</span>
        <span className="truncate text-sub">{p.name}</span>
      </div>
      <div className="flex items-center gap-8">
        <Segmented
          value={view}
          onChange={(v) => patch({ view: v, focus: null })}
          options={[
            { value: 'tree', label: <><TreeIcon />Tree</> },
            { value: 'map', label: <><MapIcon />Map</> },
          ]}
        />
        <button type="button" onClick={() => patch({ addingEpic: true })} className={btn.primary}>
          + Epic
        </button>
      </div>
    </div>
  );
}

function Title({ p }: { p: Project }) {
  const [renaming, setRenaming] = useState(false);
  const { renameProject, deleteProject } = useStore.getState();
  const h1 = 'text-26 font-semibold leading-[1.15] tracking-[-0.025em]';
  return (
    <>
      <div data-project-title className="group mt-26 flex items-center gap-8">
        {renaming ? (
          <InlineEdit
            value={p.name}
            onSave={(v) => renameProject(p.id, v)}
            onDone={() => setRenaming(false)}
            returnTo="[data-project-title] [aria-label^='More actions']"
            className={`-ml-9 w-full max-w-620 ${h1}`}
          />
        ) : (
          <h1 tabIndex={-1} onDoubleClick={() => setRenaming(true)} className={`${h1} outline-none`}>
            {p.name}
          </h1>
        )}
        <Menu
          label={`More actions for ${p.name}`}
          className="opacity-0 focus-within:opacity-100 group-hover:opacity-100 has-[:popover-open]:opacity-100"
          items={[
            { label: 'Rename', onSelect: () => setRenaming(true) },
            {
              label: 'Delete project',
              danger: true,
              onSelect: () => {
                deleteProject(p.id);
                focusUndo();
              },
            },
          ]}
        />
      </div>
      {p.desc && <p className="mt-6 max-w-620 text-pretty text-13.5 text-tertiary">{p.desc}</p>}
    </>
  );
}

function Legend({ swatch, label, n }: { swatch: string; label: string; n: number }) {
  return (
    <span className="flex items-center gap-7">
      <span className={`size-8 rounded-2 ${swatch}`} />
      {label}
      <span className="font-mono text-12 font-medium text-strong">{n}</span>
    </span>
  );
}

function ProgressCard({ p, tasks }: { p: Project; tasks: Task[] }) {
  const disciplines = useStore((s) => s.disciplines);
  const showDisc = useStore((s) => s.showDisc);
  const st = stats(tasks);
  return (
    <div className="mt-22 flex flex-col gap-16 rounded-14 border border-white/6 bg-card px-22 pb-18 pt-20">
      <div className="flex flex-wrap items-end justify-between gap-20">
        <div className="flex items-end gap-16">
          <Pct value={st.pct} className="text-46 leading-[0.85]" unitClass="text-22" />
          <div className="flex flex-col gap-1">
            <span className="text-13 font-medium text-strong">Project complete</span>
            <span className="text-12 text-muted">
              {st.total ? `${st.done} of ${st.total} tasks done · ${p.epics.length} epics` : `${p.epics.length} epics · no tasks yet`}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-18 text-12 text-tertiary">
          <Legend swatch="bg-done" label="Done" n={st.done} />
          <Legend swatch="bg-doing" label="In progress" n={st.doing} />
          <Legend swatch="shadow-[inset_0_0_0_1px_rgba(255,255,255,0.25)]" label="Not started" n={st.todo} />
        </div>
      </div>
      <StackedBar s={st} className="h-8" />
      {showDisc && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-x-22 gap-y-12 border-t border-white/5 pt-16">
          {disciplines.map((d) => {
            const ds = stats(tasks.filter((t) => t.d === d.code));
            return (
              <div key={d.code} className="flex flex-col gap-7">
                <div className="flex items-center gap-8">
                  <DisciplineTag d={d} w={30} className="leading-[normal]" />
                  <span className="flex-1 text-12 text-secondary">{d.name}</span>
                  <span className="font-mono text-12 font-medium text-strong">{ds.total ? `${ds.pct}%` : '—'}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-9 bg-white/6">
                  <div className="h-full rounded-9 transition-[width] duration-300" style={{ width: `${ds.pct}%`, background: discColor(d.hue) }} />
                </div>
                <span className="text-11 text-faint">{ds.total ? `${ds.done} of ${ds.total} done` : 'No tasks'}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Toolbar({ tasks }: { tasks: Task[] }) {
  const disciplines = useStore((s) => s.disciplines);
  const { view, detail, hideDone, filter } = useStore(useShallow((s) => ({ view: s.view, detail: s.detail, hideDone: s.hideDone, filter: s.filter })));
  const anyOpen = useStore((s) => currentProject(s)?.epics.some((e) => e.open) ?? false);
  const { patch, setAllOpen } = useStore.getState();
  const chips = [
    { key: 'all', label: 'All', count: tasks.length, color: '' },
    ...disciplines.map((d) => ({ key: d.code, label: d.name, count: tasks.filter((t) => t.d === d.code).length, color: discColor(d.hue) })),
  ];

  return (
    <div className="mt-24 flex flex-wrap items-center justify-between gap-12">
      <div className="flex flex-wrap gap-4">
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            aria-pressed={filter === c.key}
            onClick={() => patch({ filter: c.key })}
            className={`flex items-center gap-7 rounded-full border px-11 py-5 text-12 ${filter === c.key ? 'border-white/12 bg-white/8 text-fg' : 'border-white/6 text-tertiary'}`}
          >
            {c.color && <span className="size-6 rounded-full" style={{ background: c.color }} />}
            <span>{c.label}</span>
            <span className="font-mono text-10.5 font-medium text-faint">{c.count}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-16 text-12 text-tertiary">
        {view === 'map' ? (
          <div className="flex items-center gap-12 text-11.5 text-muted">
            <span className="flex items-center gap-6"><span className="size-10 rounded-3 bg-done" />Done</span>
            <span className="flex items-center gap-6"><span className="size-10 rounded-3 bg-doing" />In progress</span>
            <span className="flex items-center gap-6"><span className="size-10 rounded-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]" />Not started</span>
          </div>
        ) : (
          <Segmented
            small
            value={detail}
            onChange={(v) => patch({ detail: v })}
            options={[{ value: 'bar', label: 'Bar' }, { value: 'squares', label: 'Squares' }, { value: 'grouped', label: 'Grouped' }]}
          />
        )}
        <Switch on={hideDone} onChange={(v) => patch({ hideDone: v })}>Hide done</Switch>
        {view === 'tree' && (
          <button type="button" onClick={() => setAllOpen(!anyOpen)} className="hover:text-fg">
            {anyOpen ? 'Collapse all' : 'Expand all'}
          </button>
        )}
      </div>
    </div>
  );
}
