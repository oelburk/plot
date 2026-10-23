import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { InlineEdit } from '../components/InlineEdit';
import { dragSource, DropLine, epicDrop, horizontal, taskDrop, useDragging, useDropPos } from '../components/reorder';
import { AddEpicInput, AddTaskInput, NotesPanel, TaskMenu } from '../components/tasks';
import { DisciplineTag, hasNotes, NotesIcon, Pct, squareBg, StackedBar, StatusToggle } from '../components/ui';
import { discColor, groupByDiscipline, lookup } from '../lib/disciplines';
import { focusSoon } from '../lib/focus';
import { pad, plural } from '../lib/format';
import { isComplete, isVisible, stats } from '../lib/progress';
import { DONE, STATUS_LABELS, TODO, type Epic, type Project, type Task } from '../lib/types';
import { useStore } from '../store';

export function MapView({ p }: { p: Project }) {
  const addingEpic = useStore((s) => s.addingEpic);
  const { patch } = useStore.getState();
  return (
    <div className="mt-12 grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-12">
      {p.epics.map((e, i) => (
        <Tile key={e.id} epics={p.epics} epic={e} index={i} />
      ))}
      <div className="flex min-h-160 flex-col justify-center rounded-14 border border-dashed border-white/12 p-16">
        {addingEpic ? (
          <AddEpicInput index={p.epics.length} tile />
        ) : (
          <button type="button" data-add-epic onClick={() => patch({ addingEpic: true })} className="text-13 text-muted hover:text-fg">
            + Add epic
          </button>
        )}
      </div>
    </div>
  );
}

function Tile({ epics, epic, index }: { epics: Epic[]; epic: Epic; index: number }) {
  const disciplines = useStore((s) => s.disciplines);
  const focused = useStore((s) => s.focus === epic.id);
  const pos = useDropPos(epic.id);
  const dragging = useDragging(epic.id);
  const { patch } = useStore.getState();
  const st = stats(epic.tasks);

  return (
    // The tile is a plain div so a click anywhere opens the panel; the label/name button carries the keyboard and screen reader semantics.
    <div
      {...dragSource('epic', epic.id)}
      {...epicDrop(epics, epic, horizontal)}
      onClick={(e) => e.detail < 2 && patch({ focus: focused ? null : epic.id, openTask: null, adding: null })}
      className={`relative flex cursor-pointer flex-col gap-14 rounded-14 border px-16 pb-14 pt-16 transition-[border-color] duration-150 ${dragging ? 'opacity-40' : ''} ${pos === 'in' ? 'border-select bg-focused' : focused ? 'border-white/28 bg-focused' : 'border-white/6 bg-card hover:border-white/16'}`}
    >
      <DropLine pos={pos} x />
      <div className="flex items-start justify-between gap-12">
        <button type="button" aria-expanded={focused} data-tile={epic.id} className="flex min-w-0 flex-col gap-4 text-left leading-[inherit]">
          <span className="font-mono text-10.5 font-medium leading-[normal] tracking-[0.06em] text-index">EPIC {pad(index + 1)}</span>
          <span className="text-14 font-medium tracking-[-0.01em]">{epic.name}</span>
        </button>
        <Pct value={st.pct} complete={isComplete(st)} className="text-26 leading-none" unitClass="text-13" />
      </div>
      <StackedBar s={st} soft className="h-4" />
      <div className="flex min-h-40 flex-col gap-7">
        {groupByDiscipline(epic.tasks, disciplines).map((g) => (
          <div key={g.d.code} className="flex items-start gap-10">
            <span className="w-24 shrink-0 font-mono text-9.5 font-medium leading-16" style={{ color: discColor(g.d.hue) }}>
              {g.d.tag}
            </span>
            <div className="flex flex-wrap gap-4">
              {g.tasks.map((t) => (
                <MapSquare key={t.id} epicId={epic.id} task={t} />
              ))}
            </div>
          </div>
        ))}
        {!st.total && <span className="text-12 text-faint">No tasks yet. Open to add some.</span>}
      </div>
      <div className="flex justify-between gap-10 border-t border-white/5 pt-10 text-11.5 text-muted">
        <span>{st.total ? `${st.done} done · ${st.doing} in progress` : 'Empty'}</span>
        <span>{plural(st.total, 'task')}</span>
      </div>
    </div>
  );
}

function MapSquare({ epicId, task }: { epicId: string; task: Task }) {
  const selected = useStore((s) => s.openTask === task.id);
  const dim = useStore((s) => !isVisible(task, s.filter, s.hideDone));
  const { patch } = useStore.getState();
  const label = `${task.title} · ${STATUS_LABELS[task.s]}`;
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        // Reveal the clicked task: turn off Hide done or clear the discipline filter if either one hides it.
        const { filter } = useStore.getState();
        patch({
          focus: epicId,
          openTask: task.id,
          adding: null,
          ...(task.s === DONE ? { hideDone: false } : {}),
          ...(filter !== 'all' && task.d !== filter ? { filter: 'all' } : {}),
        });
      }}
      className="size-16 rounded-4 transition-[background-color] duration-150 hover:scale-115"
      style={{
        background: squareBg(task.s),
        boxShadow: selected ? '0 0 0 2px var(--color-app), 0 0 0 3.5px var(--color-fg)' : task.s === TODO ? 'inset 0 0 0 1px rgba(255,255,255,0.14)' : 'none',
        opacity: dim ? 0.18 : 1,
      }}
    />
  );
}

export function EpicPanel({ epic, index }: { epic: Epic; index: number }) {
  const { filter, hideDone, adding } = useStore(useShallow((s) => ({ filter: s.filter, hideDone: s.hideDone, adding: s.adding })));
  const { patch, renameEpic } = useStore.getState();
  const [renaming, setRenaming] = useState(false);
  const st = stats(epic.tasks);
  const tasks = epic.tasks.filter((t) => isVisible(t, filter, hideDone));

  return (
    <aside className="flex min-h-0 w-400 shrink-0 flex-col border-l border-white/7 bg-panel">
      <div className="flex flex-col gap-12 border-b border-white/6 px-20 py-18">
        <div className="flex items-center justify-between">
          <span className="font-mono text-10.5 font-medium leading-[normal] tracking-[0.06em] text-label">
            EPIC {pad(index + 1)} · {st.done}/{st.total} DONE
          </span>
          <button
            type="button"
            title="Close"
            aria-label="Close"
            onClick={() => {
              patch({ focus: null, openTask: null, adding: null });
              focusSoon(`[data-tile="${epic.id}"]`);
            }}
            className="size-26 rounded-6 text-16 leading-none text-tertiary hover:bg-white/6 hover:text-fg"
          >
            ×
          </button>
        </div>
        <div className="group flex items-end justify-between gap-12">
          {renaming ? (
            <InlineEdit
              value={epic.name}
              onSave={(v) => renameEpic(epic.id, v)}
              onDone={() => setRenaming(false)}
              returnTo="[data-epic-edit]"
              className="-my-2 -ml-9 flex-1 text-18 font-semibold tracking-[-0.02em]"
            />
          ) : (
            <div className="flex min-w-0 items-start gap-10">
              <span onDoubleClick={() => setRenaming(true)} className="text-18 font-semibold leading-[1.2] tracking-[-0.02em]">
                {epic.name}
              </span>
              {/* Hidden at rest so the panel matches the handoff; shown on hover and keyboard focus, like the ⋯ on tree rows. */}
              <button
                type="button"
                data-epic-edit
                aria-label="Edit epic name"
                onClick={() => setRenaming(true)}
                className="mt-1 shrink-0 rounded-6 border border-white/8 px-8 py-1 text-11.5 text-tertiary opacity-0 transition-opacity duration-120 hover:border-white/16 hover:text-fg focus-visible:opacity-100 group-hover:opacity-100"
              >
                Edit
              </button>
            </div>
          )}
          <Pct value={st.pct} className="text-24 leading-none" unitClass="text-13" />
        </div>
        <StackedBar s={st} soft className="h-4" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto px-10 pb-24 pt-10">
        {tasks.map((t) => (
          <PanelTask key={t.id} epic={epic} task={t} visible={tasks.map((x) => x.id)} />
        ))}
        {!tasks.length && <div className="px-12 py-20 text-12.5 text-faint">No tasks here yet.</div>}
        <div className="px-2 pt-6">
          {adding === epic.id ? (
            <AddTaskInput epicId={epic.id} stacked />
          ) : (
            <button
              type="button"
              data-add-task={epic.id}
              onClick={() => patch({ adding: epic.id })}
              className="w-full rounded-10 border border-dashed border-white/10 px-12 py-10 text-left text-12.5 text-muted hover:border-white/20 hover:text-fg"
            >
              + Add task
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

function PanelTask({ epic, task, visible }: { epic: Epic; task: Task; visible: string[] }) {
  const disciplines = useStore((s) => s.disciplines);
  const isOpen = useStore((s) => s.openTask === task.id);
  const labels = useStore((s) => s.toggleStyle === 'labels');
  const pos = useDropPos(task.id);
  const dragging = useDragging(task.id);
  const { patch, setStatus, updateTask } = useStore.getState();
  const [renaming, setRenaming] = useState(false);
  const rename = () => setRenaming(true);
  return (
    // Not draggable while open or renaming, so selecting text in its fields doesn't start a drag.
    <div
      {...(isOpen || renaming ? {} : dragSource('task', task.id))}
      {...taskDrop(epic, task)}
      className={`group relative flex flex-col gap-9 rounded-10 py-10 pl-12 pr-10 hover:bg-white/2.5 ${isOpen ? 'bg-white/3.5' : ''} ${dragging ? 'opacity-40' : ''}`}
    >
      <DropLine pos={pos} className="inset-x-10" />
      <div className="flex items-start gap-10">
        <DisciplineTag d={lookup(disciplines, task.d)} className="mt-1 leading-[normal]" />
        {renaming ? (
          <InlineEdit
            value={task.title}
            onSave={(v) => updateTask(task.id, { title: v })}
            onDone={() => setRenaming(false)}
            returnTo={`[data-task="${task.id}"]`}
            className="-my-3 -ml-9 flex-1 text-13"
          />
        ) : (
          <button
            type="button"
            data-task={task.id}
            aria-expanded={isOpen}
            onClick={(e) => e.detail < 2 && patch({ openTask: isOpen ? null : task.id })}
            onDoubleClick={rename}
            className={`min-w-0 flex-1 text-pretty text-left text-13 leading-[1.4] ${task.s === DONE ? 'text-muted' : 'text-task'}`}
          >
            {task.title}
          </button>
        )}
        {hasNotes(task) && (
          <span className="mt-5">
            <NotesIcon />
          </span>
        )}
        <TaskMenu task={task} epic={epic} visible={visible} onRename={rename} className="-my-3" />
      </div>
      <div className="flex pl-42">
        <StatusToggle inPanel value={task.s} labels={labels} onChange={(s) => setStatus(task.id, s)} />
      </div>
      {isOpen && <NotesPanel task={task} onRename={rename} compact />}
    </div>
  );
}
