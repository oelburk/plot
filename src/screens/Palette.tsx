import { ArrowLeftRight, ArrowRight, Download, LayoutGrid, Plus, Settings as SettingsIcon } from 'lucide-react';
import { Fragment, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Modal } from '../components/Modal';
import { DisciplineTag, Kbd } from '../components/ui';
import { lookup } from '../lib/disciplines';
import { saveTextFile } from '../lib/files';
import { isImeKey } from '../lib/focus';
import { exportJson } from '../lib/io';
import { allTasks, stats } from '../lib/progress';
import { hasQuickSyntax, parseQuickAdd } from '../lib/quickAdd';
import type { Discipline } from '../lib/types';
import { currentProject, useStore } from '../store';

interface Item {
  group: string;
  icon: ReactNode;
  label: string;
  meta?: string;
  quick?: { epic: string; d: Discipline };
  run: () => void;
}

const icon = { size: 13, strokeWidth: 1.5 };

export function Palette() {
  const projects = useStore((s) => s.projects);
  const disciplines = useStore((s) => s.disciplines);
  const view = useStore((s) => s.view);
  const focus = useStore((s) => s.focus);
  const project = useStore(currentProject);
  const { patch, go, addTask } = useStore.getState();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const listId = useId();
  const activeItem = useRef<HTMLButtonElement>(null);
  const close = () => patch({ overlay: 'none' });

  const raw = q.trim();
  const ql = raw.toLowerCase();
  let list: Item[] = [
    {
      group: 'Actions',
      icon: <Plus {...icon} />,
      label: 'New project',
      run: () => {
        close();
        // opening in the next frame lets the palette hand focus back to its opener before New project captures it
        requestAnimationFrame(() => patch({ overlay: 'new' }));
      },
    },
    {
      group: 'Actions',
      icon: <ArrowLeftRight {...icon} />,
      label: view === 'map' ? 'Switch to Tree view' : 'Switch to Map view',
      run: () => {
        go('project');
        patch({ view: view === 'map' ? 'tree' : 'map' });
      },
    },
    { group: 'Actions', icon: <LayoutGrid {...icon} />, label: 'All projects', run: () => go('home') },
    {
      group: 'Actions',
      icon: <Download {...icon} />,
      label: 'Export data as JSON',
      run: () => {
        // ponytail: a rejected save() dialog only reaches the console; Settings shows the error, the palette has no line for it
        saveTextFile('plot-export.json', exportJson(useStore.getState()), 'application/json').catch(console.error);
        close();
      },
    },
    { group: 'Actions', icon: <SettingsIcon {...icon} />, label: 'Settings', run: () => go('settings') },
    ...projects.map((p) => ({
      group: 'Projects',
      icon: <ArrowRight {...icon} />,
      label: p.name,
      meta: `${stats(allTasks(p)).pct}%`,
      run: () => go('project', p.id),
    })),
  ].filter((i) => !ql || i.label.toLowerCase().includes(ql));

  if (raw && project?.epics.length) {
    const pq = parseQuickAdd(raw, project, disciplines, focus);
    const epic = pq.epic;
    if (pq.title && epic) {
      const qa: Item = {
        group: `Quick add · ${project.name}`,
        icon: <Plus {...icon} />,
        label: pq.title,
        meta: 'add',
        quick: { epic: epic.name, d: lookup(disciplines, pq.d) },
        run: () => {
          addTask(epic.id, pq.title, pq.d, project.id);
          close();
        },
      };
      list = hasQuickSyntax(raw) || !list.length ? [qa, ...list] : [...list, qa];
    }
  }
  const active = Math.min(sel, Math.max(list.length - 1, 0));

  useEffect(() => {
    activeItem.current?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (isImeKey(e)) return;
    const n = list.length;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSel(n ? (active + 1) % n : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSel(n ? (active - 1 + n) % n : 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      list[active]?.run();
    }
  };

  return (
    <Modal onClose={close} label="Command palette" width={620} top={92} className="rounded-14">
      <div className="flex items-center gap-12 border-b border-white/7 px-16 py-15">
        <span className="size-12 shrink-0 rounded-full border-[1.5px] border-tertiary" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setSel(0);
          }}
          onKeyDown={onKey}
          role="combobox"
          aria-expanded
          aria-autocomplete="list"
          aria-controls={listId}
          aria-activedescendant={list.length ? `${listId}-${active}` : undefined}
          placeholder="Search, run a command, or add a task…"
          aria-label="Search, run a command, or add a task"
          className="min-w-0 flex-1 bg-transparent px-2 py-1 text-15 text-fg outline-none"
        />
        <Kbd wide>esc</Kbd>
      </div>
      <div id={listId} role="listbox" aria-label="Results" className="max-h-380 overflow-auto p-6">
        {list.map((it, i) => (
          <Fragment key={`${it.group}-${it.label}-${i}`}>
            {(i === 0 || list[i - 1].group !== it.group) && (
              <div role="presentation" className="px-10 pb-5 pt-10 font-mono leading-[normal] text-10.5 font-medium uppercase tracking-[0.08em] text-index">{it.group}</div>
            )}
            <button
              ref={i === active ? activeItem : null}
              id={`${listId}-${i}`}
              type="button"
              role="option"
              aria-selected={i === active}
              tabIndex={-1}
              onClick={it.run}
              onMouseMove={() => setSel(i)}
              className={`flex w-full items-center gap-12 rounded-8 px-10 py-9 text-left text-13 text-fg ${i === 0 || list[i - 1].group !== it.group ? 'scroll-mt-30' : ''} ${i === active ? 'bg-white/7' : ''}`}
            >
              <span className={`flex size-22 shrink-0 items-center justify-center rounded-6 bg-white/5 ${it.quick ? 'text-done-fg' : 'text-secondary'}`}>{it.icon}</span>
              <span className="min-w-0 flex-1 truncate">{it.label}</span>
              {it.quick && (
                <span className="flex shrink-0 items-center gap-6">
                  <span className="rounded-5 bg-white/5 px-8 py-2 text-11.5 text-secondary">{it.quick.epic}</span>
                  <DisciplineTag d={it.quick.d} />
                </span>
              )}
              {it.meta && <span className="shrink-0 font-mono text-11 font-medium text-faint">{it.meta}</span>}
            </button>
          </Fragment>
        ))}
        {!list.length && <div className="px-12 py-22 text-12.5 text-muted">Nothing matches. Type a task name to add it.</div>}
      </div>
      <div className="flex flex-wrap justify-between gap-12 border-t border-white/7 px-16 py-10 text-11.5 text-faint">
        <span>
          Quick add: <span className="font-mono leading-[inherit] text-secondary">#fe #be #ux #other</span> sets the owner, <span className="font-mono leading-[inherit] text-secondary">@epic</span> picks the epic
        </span>
        <span className="font-mono leading-[inherit]">↑↓ ↵</span>
      </div>
    </Modal>
  );
}
