import { useState, type KeyboardEvent } from 'react';
import { focusSoon, focusUndo, isImeKey } from '../lib/focus';
import { pad, relativeTime } from '../lib/format';
import type { Epic, Task, TaskComment } from '../lib/types';
import { useStore } from '../store';
import { Menu } from './Menu';
import { moveItems } from './reorder';
import { fieldRing, OwnerPills } from './ui';

export function NotesPanel({ task, onRename, compact = false }: { task: Task; onRename: () => void; compact?: boolean }) {
  const { updateTask, deleteTask } = useStore.getState();
  const action = `px-6 py-1 text-muted ${compact ? 'text-11' : 'text-11.5'}`;
  return (
    <div
      className={
        compact
          ? 'ml-42 flex flex-col gap-10 rounded-9 border border-white/7 bg-search px-12 py-10'
          : 'mb-10 ml-8 mt-2 flex flex-col gap-10 rounded-10 border border-white/7 bg-inset px-14 py-12'
      }
    >
      <textarea
        value={task.notes}
        onChange={(e) => updateTask(task.id, { notes: e.target.value })}
        placeholder="Add notes…"
        aria-label="Notes"
        rows={3}
        className={`w-full resize-y bg-transparent leading-[1.55] text-strong outline-none ${fieldRing} ${compact ? 'text-12.5' : 'text-13'}`}
      />
      <Comments task={task} compact={compact} />
      <div className={`flex flex-wrap items-center border-t border-white/6 ${compact ? 'gap-5 pt-9' : 'gap-6 pt-10'}`}>
        {!compact && <span className="mr-4 text-11.5 text-faint">Owner</span>}
        <OwnerPills compact={compact} value={task.d} onChange={(d) => updateTask(task.id, { d })} />
        <span className="flex-1" />
        <button type="button" onClick={onRename} className={`${action} hover:text-fg`}>
          Rename
        </button>
        <button
          type="button"
          onClick={() => {
            deleteTask(task.id);
            focusUndo();
          }}
          className={`${action} hover:text-danger`}
        >
          {compact ? 'Delete' : 'Delete task'}
        </button>
      </div>
    </div>
  );
}

const fullTime = (iso: string) => new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

function Comments({ task, compact }: { task: Task; compact: boolean }) {
  const { addComment } = useStore.getState();
  const [draft, setDraft] = useState('');
  const comments = task.comments ?? [];
  return (
    <div className={`flex flex-col border-t border-white/6 ${compact ? 'gap-8 pt-9' : 'gap-10 pt-10'}`}>
      <span className="text-11.5 text-faint">Comments{comments.length > 0 && ` · ${comments.length}`}</span>
      {comments.map((c) => (
        <CommentItem key={c.id} taskId={task.id} c={c} compact={compact} />
      ))}
      <CommentField
        value={draft}
        onChange={setDraft}
        onSubmit={() => {
          addComment(task.id, draft);
          setDraft('');
        }}
        label="Add a comment"
        placeholder="Add a comment…"
        compact={compact}
      />
    </div>
  );
}

function CommentItem({ taskId, c, compact }: { taskId: string; c: TaskComment; compact: boolean }) {
  const { editComment, deleteComment } = useStore.getState();
  const [draft, setDraft] = useState<string | null>(null);
  const action = 'rounded-4 px-4 text-faint opacity-0 hover:text-fg focus-visible:opacity-100 group-hover:opacity-100';
  return (
    <div className="group flex flex-col gap-3">
      <div className="flex items-center gap-6 text-11 text-faint">
        <time dateTime={c.at} title={fullTime(c.at)}>
          {relativeTime(c.at)}
        </time>
        {c.edited && <span title={`Edited ${fullTime(c.edited)}`}>· edited</span>}
        <span className="flex-1" />
        {draft === null && (
          <>
            <button type="button" data-comment-edit={c.id} onClick={() => setDraft(c.text)} className={action}>
              Edit
            </button>
            <button
              type="button"
              onClick={() => {
                deleteComment(taskId, c.id);
                focusUndo();
              }}
              className={`${action} hover:text-danger`}
            >
              Delete
            </button>
          </>
        )}
      </div>
      {draft === null ? (
        <p className={`whitespace-pre-wrap break-words leading-[1.5] text-strong ${compact ? 'text-12.5' : 'text-13'}`}>{c.text}</p>
      ) : (
        <CommentField
          autoFocus
          value={draft}
          onChange={setDraft}
          onSubmit={() => {
            editComment(taskId, c.id, draft);
            setDraft(null);
            focusSoon(`[data-comment-edit="${c.id}"]`);
          }}
          onCancel={() => setDraft(null)}
          returnTo={`[data-comment-edit="${c.id}"]`}
          label="Edit comment"
          compact={compact}
        />
      )}
    </div>
  );
}

/** Enter submits and Shift+Enter adds a line. With `onCancel`, Esc and clicking away cancel, like the inline renames; Esc then focuses `returnTo`. */
function CommentField({ value, onChange, onSubmit, onCancel, returnTo, label, placeholder, autoFocus = false, compact }: { value: string; onChange: (v: string) => void; onSubmit: () => void; onCancel?: () => void; returnTo?: string; label: string; placeholder?: string; autoFocus?: boolean; compact: boolean }) {
  return (
    <div className="flex items-end gap-8 rounded-7 border border-white/8 py-6 pl-9 pr-7 focus-within:border-white/16">
      <textarea
        autoFocus={autoFocus}
        rows={1}
        value={value}
        aria-label={label}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => e.target.setSelectionRange(e.target.value.length, e.target.value.length)}
        onBlur={onCancel}
        onKeyDown={(e) => {
          if (isImeKey(e)) return;
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (value.trim()) onSubmit();
          } else if (e.key === 'Escape' && onCancel) {
            e.stopPropagation();
            onCancel();
            if (returnTo) focusSoon(returnTo);
          }
        }}
        className={`field-sizing-content max-h-200 min-w-0 flex-1 resize-none bg-transparent leading-[1.5] text-strong outline-none ${compact ? 'text-12.5' : 'text-13'}`}
      />
      <span className="pb-2 font-mono text-10.5 font-medium text-faint">↵</span>
    </div>
  );
}

export function TaskMenu({ task, epic, visible, onRename, className = '' }: { task: Task; epic: Epic; visible: string[]; onRename: () => void; className?: string }) {
  const { moveTask, deleteTask } = useStore.getState();
  return (
    <Menu
      label={`More actions for ${task.title}`}
      className={`opacity-0 focus-within:opacity-100 group-hover:opacity-100 has-[:popover-open]:opacity-100 ${className}`}
      items={[
        { label: 'Rename', onSelect: onRename },
        ...moveItems(
          epic.tasks.map((t) => t.id),
          visible,
          task.id,
          (i) => {
            moveTask(task.id, epic.id, i);
            focusSoon(`[data-task="${task.id}"]`);
          },
        ),
        {
          label: 'Delete task',
          danger: true,
          onSelect: () => {
            deleteTask(task.id);
            focusUndo();
          },
        },
      ]}
    />
  );
}

export function AddTaskInput({ epicId, stacked = false }: { epicId: string; stacked?: boolean }) {
  const disciplines = useStore((s) => s.disciplines);
  const { addTask, patch } = useStore.getState();
  const [draft, setDraft] = useState('');
  const [d, setD] = useState(() => disciplines[0]?.code ?? 'OT');

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (isImeKey(e)) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      if (draft.trim()) {
        addTask(epicId, draft, d);
        setDraft('');
      }
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      patch({ adding: null });
      focusSoon(`[data-add-task="${epicId}"]`);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const i = disciplines.findIndex((x) => x.code === d);
      setD(disciplines[(i + (e.shiftKey ? disciplines.length - 1 : 1)) % disciplines.length].code);
    }
  };

  const input = (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder="Task name…"
      aria-label="Task name"
      className="min-w-0 flex-1 bg-transparent text-13 text-fg outline-none"
    />
  );
  const hint = <span className="pl-4 font-mono text-10.5 font-medium text-faint">tab · ↵</span>;

  return stacked ? (
    <div className="flex flex-col gap-8 rounded-10 border border-white/12 bg-search p-10">
      {input}
      <div className="flex flex-wrap items-center gap-5">
        <OwnerPills short value={d} onChange={setD} />
        <span className="flex-1" />
        {hint}
      </div>
    </div>
  ) : (
    <div className="flex min-h-40 items-center gap-8 rounded-8 border border-white/12 bg-inset py-3 pl-10 pr-8">
      {input}
      <OwnerPills short value={d} onChange={setD} />
      {hint}
    </div>
  );
}

export function AddEpicInput({ index, tile = false }: { index: number; tile?: boolean }) {
  const { addEpic, patch } = useStore.getState();
  const [draft, setDraft] = useState('');
  const input = (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (isImeKey(e)) return;
        if (e.key === 'Enter') {
          e.preventDefault();
          if (draft.trim()) {
            addEpic(draft);
            setDraft('');
          }
        } else if (e.key === 'Escape') {
          e.stopPropagation();
          patch({ addingEpic: false });
          focusSoon('[data-add-epic]');
        }
      }}
      placeholder="Epic name, then Enter"
      aria-label="Epic name"
      className={`min-w-0 flex-1 rounded-7 border border-white/12 bg-inset px-10 text-14 text-fg outline-none ${tile ? 'w-full py-8' : 'py-6'}`}
    />
  );
  if (tile) return input;
  return (
    <div className="flex items-center gap-12 py-10 pl-14 pr-18">
      <span className="w-16 shrink-0" />
      <span className="w-18 font-mono text-11 font-medium text-index">{pad(index + 1)}</span>
      {input}
    </div>
  );
}
