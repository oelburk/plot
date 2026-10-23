import { useState } from 'react';
import { allTasks, stats } from '../lib/progress';
import { currentProject, useStore } from '../store';
import { InlineEdit } from './InlineEdit';
import { Kbd, Ring } from './ui';

const row = 'flex items-center gap-10 rounded-7 px-10 py-7 text-left text-13 hover:bg-white/4';

export function Sidebar() {
  const projects = useStore((s) => s.projects);
  const screen = useStore((s) => s.screen);
  const activeId = useStore((s) => currentProject(s)?.id);
  const { go, patch, renameProject } = useStore.getState();
  const [renaming, setRenaming] = useState<string | null>(null);

  return (
    <aside className="relative flex w-232 shrink-0 flex-col border-r border-white/6 bg-sidebar px-10 pb-12 pt-14 tauri:pt-42">
      <div data-tauri-drag-region className="absolute inset-x-0 top-0 hidden h-40 tauri:block" />
      <div className="flex items-center gap-10 px-8 pb-16 pt-4">
        <span className="relative size-16 shrink-0 overflow-hidden rounded-4 border-[1.5px] border-fg">
          <span className="absolute inset-x-0 bottom-0 h-[55%] bg-fg" />
        </span>
        <span className="text-14 font-semibold tracking-[-0.01em]">Plot</span>
      </div>

      <button
        type="button"
        onClick={() => patch({ overlay: 'palette' })}
        className="mb-12 flex w-full items-center gap-9 rounded-8 border border-white/7 bg-search py-7 pl-10 pr-8 text-left text-12.5 text-muted hover:border-white/14"
      >
        <span className="size-10 shrink-0 rounded-full border-[1.5px] border-current" />
        <span className="flex-1">Search or add…</span>
        <Kbd>⌘K</Kbd>
      </button>

      <button type="button" onClick={() => go('home')} className={`${row} text-strong ${screen === 'home' ? 'bg-white/6' : ''}`}>
        <span className="grid w-14 shrink-0 grid-cols-[5px_5px] justify-center gap-2">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="size-5 rounded-1.5 bg-tertiary" />
          ))}
        </span>
        <span className="flex-1">All projects</span>
        <span className="font-mono text-11 font-medium text-faint">{projects.length}</span>
      </button>

      <div className="flex items-center justify-between pb-6 pl-10 pr-6 pt-20">
        <span className="font-mono text-10.5 font-medium uppercase tracking-[0.08em] text-label">Projects</span>
        <button
          type="button"
          title="New project"
          aria-label="New project"
          onClick={() => patch({ overlay: 'new' })}
          className="flex size-22 items-center justify-center rounded-6 text-15 leading-none text-tertiary hover:bg-white/6 hover:text-fg"
        >
          +
        </button>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-auto">
        {projects.map((p) => {
          // h-31 on the rename input below is this row's height (py-7 plus a 17px line), so the list doesn't jump
          const pct = stats(allTasks(p)).pct;
          const active = screen === 'project' && p.id === activeId;
          return renaming === p.id ? (
            <InlineEdit
              key={p.id}
              value={p.name}
              onSave={(v) => renameProject(p.id, v)}
              onDone={() => setRenaming(null)}
              returnTo={`[data-project-row="${p.id}"]`}
              className="h-31 text-13"
            />
          ) : (
            <button
              key={p.id}
              type="button"
              data-project-row={p.id}
              onClick={() => go('project', p.id)}
              onDoubleClick={() => setRenaming(p.id)}
              className={`${row} focus-visible:-outline-offset-2 ${active ? 'bg-white/6 text-fg' : 'text-secondary'}`}
            >
              <Ring pct={pct} />
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              <span className="font-mono text-11 font-medium text-faint">{pct}%</span>
            </button>
          );
        })}
      </nav>

      <div className="flex flex-col gap-2 border-t border-white/6 pt-8">
        <button type="button" onClick={() => go('settings')} className={`${row} text-strong ${screen === 'settings' ? 'bg-white/6' : ''}`}>
          <span className="flex w-14 shrink-0 justify-center">
            <span className="flex size-11 items-center justify-center rounded-full border-[1.5px] border-tertiary">
              <span className="size-3 rounded-full bg-tertiary" />
            </span>
          </span>
          Settings
        </button>
        <div className="flex items-center gap-9 px-10 py-6 text-11.5 text-faint">
          <span className="mx-4 size-6 rounded-full bg-done" />
          Saved locally
        </div>
      </div>
    </aside>
  );
}
