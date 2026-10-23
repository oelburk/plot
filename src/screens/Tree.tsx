import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { InlineEdit } from '../components/InlineEdit';
import { Menu } from '../components/Menu';
import { dragSource, DropLine, epicDrop, moveItems, taskDrop, useDragging, useDropPos, vertical } from '../components/reorder';
import { AddEpicInput, AddTaskInput, NotesPanel, TaskMenu } from '../components/tasks';
import { DisciplineTag, hasNotes, NotesIcon, squareBg, StackedBar, StatusToggle } from '../components/ui';
import { discColor, groupByDiscipline, lookup } from '../lib/disciplines';
import { focusSoon, focusUndo } from '../lib/focus';
import { pad, plural } from '../lib/format';
import { isComplete, isVisible, stats } from '../lib/progress';
import { DONE, STATUS_LABELS, TODO, type Discipline, type Epic, type Project, type Task } from '../lib/types';
import { useStore } from '../store';

export function Tree({ p }: { p: Project }) {
  const addingEpic = useStore((s) => s.addingEpic);
  const { patch } = useStore.getState();
  return (
    <div className="mt-12 flex flex-col gap-1 overflow-hidden rounded-14 border border-white/6 bg-white/6">
      {p.epics.map((e, i) => (
        <EpicBlock key={e.id} epics={p.epics} epic={e} index={i} />
      ))}
      <div className="bg-tree">
        {addingEpic ? (
          <AddEpicInput index={p.epics.length} />
        ) : (
          <button type="button" data-add-epic onClick={() => patch({ addingEpic: true })} className="flex w-full items-center gap-12 py-13 pl-14 pr-18 text-left text-13 text-faint hover:text-strong focus-visible:-outline-offset-2">
            <span className="w-16 shrink-0 text-center">+</span>Add epic
          </button>
        )}
      </div>
    </div>
  );
}

function EpicBlock({ epics, epic, index }: { epics: Epic[]; epic: Epic; index: number }) {
  const { detail, filter, hideDone } = useStore(useShallow((s) => ({ detail: s.detail, filter: s.filter, hideDone: s.hideDone })));
  const disciplines = useStore((s) => s.disciplines);
  const { toggleEpic, renameEpic, deleteEpic, moveEpic } = useStore.getState();
  const [renaming, setRenaming] = useState(false);
  const pos = useDropPos(epic.id);
  const dragging = useDragging(epic.id);
  const ids = epics.map((e) => e.id);
  const shown = epic.tasks.filter((t) => isVisible(t, filter, hideDone));
  const st = stats(epic.tasks);
  const groups = groupByDiscipline(epic.tasks, disciplines);
  const lead = (
    <>
      <span className={`flex size-16 shrink-0 items-center justify-center transition-transform duration-150 ${epic.open ? 'rotate-90' : ''}`}>
        <span className="size-0 border-y-4 border-l-5 border-y-transparent border-l-tertiary" />
      </span>
      <span className="w-18 font-mono text-11 font-medium text-index">{pad(index + 1)}</span>
    </>
  );

  return (
    <div {...epicDrop(epics, epic, vertical)} className={`relative bg-tree ${dragging ? 'opacity-40' : ''} ${pos === 'in' ? 'shadow-[inset_0_0_0_1.5px_var(--color-select)]' : ''}`}>
      <DropLine pos={pos} className="inset-x-0" />
      {/* The row is a plain div so a click anywhere toggles; the toggle button below carries the keyboard and screen reader semantics. */}
      <div
        {...(renaming ? {} : dragSource('epic', epic.id))}
        onClick={(e) => e.detail < 2 && toggleEpic(epic.id)}
        className="group flex w-full cursor-pointer items-center gap-12 py-13 pl-14 pr-18 hover:bg-white/2"
      >
        {renaming ? (
          <>
            <span className="flex items-center gap-12">{lead}</span>
            <InlineEdit
              value={epic.name}
              onSave={(v) => renameEpic(epic.id, v)}
              onDone={() => setRenaming(false)}
              returnTo={`[data-epic-toggle="${epic.id}"]`}
              className="text-14 font-medium"
            />
          </>
        ) : (
          <button type="button" data-epic-toggle={epic.id} aria-expanded={epic.open} className="flex items-center gap-12 text-left leading-[inherit]">
            {lead}
            <span
              onDoubleClick={() => setRenaming(true)}
              className="text-14 font-medium tracking-[-0.01em]"
            >
              {epic.name}
            </span>
          </button>
        )}
        <span className="text-12 text-faint">{plural(st.total, 'task')}</span>
        <span className="flex-1" />
        <Menu
          label={`More actions for ${epic.name}`}
          className="-my-4 opacity-0 focus-within:opacity-100 group-hover:opacity-100 has-[:popover-open]:opacity-100"
          items={[
            { label: 'Rename', onSelect: () => setRenaming(true) },
            ...moveItems(ids, ids, epic.id, (i) => {
              moveEpic(epic.id, i);
              focusSoon(`[data-epic-toggle="${epic.id}"]`);
            }),
            {
              label: 'Delete epic',
              danger: true,
              onSelect: () => {
                deleteEpic(epic.id);
                focusUndo();
              },
            },
          ]}
        />
        {detail === 'squares' ? (
          <div className="flex flex-wrap items-center justify-end gap-14">
            {groups.map((g) => (
              <div key={g.d.code} className="flex items-center gap-6">
                <span className="font-mono text-9.5 font-medium" style={{ color: discColor(g.d.hue) }}>
                  {g.d.tag}
                </span>
                <div className="flex gap-3">
                  {g.tasks.map((t) => (
                    <TreeSquare key={t.id} epic={epic} task={t} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {st.doing > 0 && <span className="text-11.5 text-doing">{st.doing} in progress</span>}
            <StackedBar s={st} soft className="h-5 w-140 shrink-0" />
          </>
        )}
        <span className={`w-40 text-right font-mono text-12.5 font-medium ${isComplete(st) ? 'text-done-fg' : 'text-fg'}`}>{st.pct}%</span>
      </div>

      {epic.open && (
        <div className="pb-12 pl-22 pr-14">
          {detail === 'grouped'
            ? groups.filter((g) => filter === 'all' || filter === g.d.code).map((g) => <Group key={g.d.code} epic={epic} d={g.d} tasks={g.tasks} />)
            : shown.map((t) => <TaskRow key={t.id} epic={epic} task={t} visible={shown.map((x) => x.id)} />)}
          <AddTaskRow epicId={epic.id} />
        </div>
      )}
    </div>
  );
}

function TreeSquare({ epic, task, small = false }: { epic: Epic; task: Task; small?: boolean }) {
  const selected = useStore((s) => s.openTask === task.id);
  const filter = useStore((s) => s.filter);
  const { patch, toggleEpic } = useStore.getState();
  const label = `${task.title} · ${STATUS_LABELS[task.s]}`;
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        if (!epic.open) toggleEpic(epic.id);
        // Reveal the clicked task: turn off Hide done or clear the discipline filter if either one hides it.
        patch({
          openTask: task.id,
          ...(task.s === DONE ? { hideDone: false } : {}),
          ...(filter !== 'all' && task.d !== filter ? { filter: 'all' } : {}),
        });
      }}
      className={small ? 'size-8 rounded-2' : 'size-10 rounded-3'}
      style={{
        background: squareBg(task.s),
        boxShadow: selected ? '0 0 0 1.5px var(--color-fg)' : task.s === TODO ? 'inset 0 0 0 1px rgba(255,255,255,0.18)' : 'none',
        opacity: small || filter === 'all' || task.d === filter ? 1 : 0.2,
      }}
    />
  );
}

function Group({ epic, d, tasks }: { epic: Epic; d: Discipline; tasks: Task[] }) {
  const { filter, hideDone } = useStore(useShallow((s) => ({ filter: s.filter, hideDone: s.hideDone })));
  const st = stats(tasks);
  const shown = tasks.filter((t) => isVisible(t, filter, hideDone));
  return (
    <>
      <div className="relative pl-26">
        <span className="absolute inset-y-0 left-0 border-l border-white/9" />
        <span className="absolute left-0 top-20 w-16 border-t border-white/9" />
        <span className="absolute bottom-0 left-50 top-30 border-l border-white/7" />
        <div className="flex min-h-40 items-center gap-10 py-4 pl-8 pr-6">
          <DisciplineTag d={d} className="leading-[normal]" />
          <span className="text-12.5 font-medium text-sub">{d.name}</span>
          <span className="text-11.5 text-faint">
            {st.done} of {st.total} done
          </span>
          <span className="flex-1" />
          <div className="flex gap-3">
            {tasks.map((t) => (
              <TreeSquare key={t.id} epic={epic} task={t} small />
            ))}
          </div>
          <span className="w-40 text-right font-mono text-11.5 font-medium text-secondary">{st.pct}%</span>
        </div>
      </div>
      {shown.map((t) => (
        <TaskRow key={t.id} epic={epic} task={t} visible={shown.map((x) => x.id)} grouped />
      ))}
    </>
  );
}

function TaskRow({ epic, task, visible, grouped = false }: { epic: Epic; task: Task; visible: string[]; grouped?: boolean }) {
  const disciplines = useStore((s) => s.disciplines);
  const isOpen = useStore((s) => s.openTask === task.id);
  const labels = useStore((s) => s.toggleStyle === 'labels');
  const { patch, setStatus, updateTask } = useStore.getState();
  const [renaming, setRenaming] = useState(false);
  const pos = useDropPos(task.id);
  const dragging = useDragging(task.id);
  const rename = () => setRenaming(true);
  return (
    <div {...taskDrop(epic, task)} className={`relative ${grouped ? 'pl-62' : 'pl-26'} ${dragging ? 'opacity-40' : ''}`}>
      <span className="absolute inset-y-0 left-0 border-l border-white/9" />
      {grouped && <span className="absolute inset-y-0 left-50 border-l border-white/7" />}
      <span className={`absolute top-20 border-t border-white/9 ${grouped ? 'left-50 w-12' : 'left-0 w-16'}`} />
      <DropLine pos={pos} className={`right-0 ${grouped ? 'left-62' : 'left-26'}`} />
      <div
        {...(renaming ? {} : dragSource('task', task.id))}
        className={`group flex min-h-40 items-center gap-12 rounded-8 py-4 pl-8 pr-6 hover:bg-white/2.5 ${isOpen ? 'bg-white/3.5' : ''}`}
      >
        {!grouped && <DisciplineTag d={lookup(disciplines, task.d)} className="leading-[normal] tracking-[0.02em]" />}
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
            className={`flex min-w-0 flex-1 items-center gap-9 text-left text-13 ${task.s === DONE ? 'text-muted' : 'text-task'}`}
          >
            <span className="truncate">{task.title}</span>
            {hasNotes(task) && <NotesIcon />}
          </button>
        )}
        <TaskMenu task={task} epic={epic} visible={visible} onRename={rename} className="-my-4" />
        <StatusToggle value={task.s} labels={labels} onChange={(s) => setStatus(task.id, s)} />
      </div>
      {isOpen && <NotesPanel task={task} onRename={rename} />}
    </div>
  );
}

function AddTaskRow({ epicId }: { epicId: string }) {
  const adding = useStore((s) => s.adding === epicId);
  const { patch } = useStore.getState();
  return (
    <div className="relative pl-26">
      <span className="absolute left-0 top-0 h-20 w-16 rounded-bl-6 border-b border-l border-white/9" />
      {adding ? (
        <AddTaskInput epicId={epicId} />
      ) : (
        <button type="button" data-add-task={epicId} onClick={() => patch({ adding: epicId })} className="flex min-h-40 items-center px-8 text-12.5 text-faint hover:text-strong">
          + Add task
        </button>
      )}
    </div>
  );
}
