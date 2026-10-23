import type { DragEvent } from 'react';
import { insertAt } from '../lib/order';
import type { Epic, Task } from '../lib/types';
import { useStore, type Drag, type DropPos } from '../store';
import type { MenuItem } from './Menu';

export const dragSource = (kind: Drag['kind'], id: string) => ({
  draggable: true,
  onDragStart: (e: DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    useStore.getState().patch({ drag: { kind, id } });
  },
  onDragEnd: () => useStore.getState().patch({ drag: null, dropAt: null }),
});

/** `at` returns null for drags this zone doesn't take, which then bubble to the zone around it. */
export const dropZone = (id: string, at: (drag: Drag, e: DragEvent<HTMLElement>) => DropPos | null, onDrop: (drag: Drag, pos: DropPos) => void) => ({
  onDragOver: (e: DragEvent<HTMLElement>) => {
    const { drag, dropAt, patch } = useStore.getState();
    const pos = drag && (drag.id === id ? null : at(drag, e));
    if (!drag || (!pos && drag.id !== id)) return;
    e.preventDefault();
    e.stopPropagation();
    const next = pos ? { id, pos } : null;
    if (dropAt?.id !== next?.id || dropAt?.pos !== next?.pos) patch({ dropAt: next });
  },
  onDrop: (e: DragEvent<HTMLElement>) => {
    const { drag, dropAt, patch } = useStore.getState();
    if (!drag || dropAt?.id !== id) return;
    e.preventDefault();
    e.stopPropagation();
    onDrop(drag, dropAt.pos);
    patch({ drag: null, dropAt: null });
  },
});

export const vertical = (e: DragEvent<HTMLElement>): DropPos => {
  const r = e.currentTarget.getBoundingClientRect();
  return e.clientY < r.top + r.height / 2 ? 'before' : 'after';
};
export const horizontal = (e: DragEvent<HTMLElement>): DropPos => {
  const r = e.currentTarget.getBoundingClientRect();
  return e.clientX < r.left + r.width / 2 ? 'before' : 'after';
};

const ids = (xs: { id: string }[]) => xs.map((x) => x.id);

/** A task row takes other tasks before or after it. */
export const taskDrop = (epic: Epic, task: Task) =>
  dropZone(
    task.id,
    (d, e) => (d.kind === 'task' ? vertical(e) : null),
    (d, pos) => useStore.getState().moveTask(d.id, epic.id, insertAt(ids(epic.tasks), d.id, task.id, pos === 'after')),
  );

/** An epic takes other epics on either `side`, and tasks dropped into it go to its end. */
export const epicDrop = (epics: Epic[], epic: Epic, side: (e: DragEvent<HTMLElement>) => DropPos) =>
  dropZone(
    epic.id,
    (d, e) => (d.kind === 'task' ? 'in' : side(e)),
    (d, pos) => {
      const { moveTask, moveEpic } = useStore.getState();
      if (d.kind === 'task') moveTask(d.id, epic.id, epic.tasks.filter((t) => t.id !== d.id).length);
      else moveEpic(d.id, insertAt(ids(epics), d.id, epic.id, pos === 'after'));
    },
  );

/** Move up and Move down step past the neighbouring visible item, so hidden items never swallow a move. */
export function moveItems(all: string[], visible: string[], id: string, move: (index: number) => void): MenuItem[] {
  const i = visible.indexOf(id);
  return [
    ...(i > 0 ? [{ label: 'Move up', onSelect: () => move(insertAt(all, id, visible[i - 1], false)) }] : []),
    ...(i >= 0 && i < visible.length - 1 ? [{ label: 'Move down', onSelect: () => move(insertAt(all, id, visible[i + 1], true)) }] : []),
  ];
}

export const useDropPos = (id: string) => useStore((s) => (s.dropAt?.id === id ? s.dropAt.pos : null));
export const useDragging = (id: string) => useStore((s) => s.drag?.id === id);

/** `x` draws a vertical line at the left or right edge, for side-by-side items. */
export function DropLine({ pos, x = false, className = '' }: { pos: DropPos | null; x?: boolean; className?: string }) {
  if (pos !== 'before' && pos !== 'after') return null;
  const edge = x ? (pos === 'before' ? '-left-7 inset-y-0 w-2' : '-right-7 inset-y-0 w-2') : pos === 'before' ? '-top-1 h-2' : '-bottom-1 h-2';
  return <span className={`pointer-events-none absolute z-10 rounded-full bg-select ${edge} ${className}`} />;
}
