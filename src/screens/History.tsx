import { Glyph } from '../components/ui';
import { focusSoon } from '../lib/focus';
import { clockTime, dayLabel, fullTime, plural } from '../lib/format';
import type { Activity, Project } from '../lib/types';
import { useStore } from '../store';

const GLYPH_COLOR = ['text-muted', 'text-doing', 'text-done'];

export function HistoryPanel({ p }: { p: Project }) {
  const { patch } = useStore.getState();
  const history = p.history ?? [];
  const days: { label: string; items: Activity[] }[] = [];
  for (const a of [...history].reverse()) {
    const label = dayLabel(a.at);
    const last = days.at(-1);
    if (last?.label === label) last.items.push(a);
    else days.push({ label, items: [a] });
  }

  return (
    <aside aria-label="History" className="flex min-h-0 w-360 shrink-0 flex-col border-l border-white/7 bg-panel">
      <div className="flex flex-col gap-10 border-b border-white/6 px-20 py-18">
        <div className="flex items-center justify-between">
          <span className="font-mono text-10.5 font-medium leading-[normal] tracking-[0.06em] text-label">
            HISTORY · {plural(history.length, 'change').toUpperCase()}
          </span>
          <button
            type="button"
            title="Close"
            aria-label="Close history"
            onClick={() => {
              patch({ showHistory: false });
              focusSoon('[data-history-toggle]');
            }}
            className="size-26 rounded-6 text-16 leading-none text-tertiary hover:bg-white/6 hover:text-fg"
          >
            ×
          </button>
        </div>
        <span className="text-18 font-semibold leading-[1.2] tracking-[-0.02em]">History</span>
        <span className="-mt-4 text-12 text-muted">Every change to this project, newest first.</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-auto px-20 pb-24">
        {days.map((d) => (
          <section key={d.label} className="flex flex-col">
            <h3 className="sticky top-0 z-1 bg-panel pb-10 pt-16 text-11.5 font-medium text-tertiary">{d.label}</h3>
            <ol className="flex flex-col">
              {d.items.map((a) => (
                <li key={a.id} className="relative flex gap-12 pb-14 before:absolute before:bottom-0 before:left-[4.5px] before:top-17 before:w-1 before:bg-white/7 last:before:hidden">
                  <span className={`mt-3 flex size-10 shrink-0 items-center justify-center ${a.s === undefined ? '' : GLYPH_COLOR[a.s]}`}>
                    {a.s === undefined ? <span className="size-6 rounded-full bg-white/22" /> : <Glyph s={a.s} />}
                  </span>
                  <p className="min-w-0 flex-1 text-pretty break-words text-12.5 leading-[1.45] text-tertiary">
                    {a.verb} {a.name && <span className="text-task">{a.name}</span>} {a.to}
                  </p>
                  <time dateTime={a.at} title={fullTime(a.at)} className="mt-2 shrink-0 font-mono text-10.5 text-faint">
                    {clockTime(a.at)}
                  </time>
                </li>
              ))}
            </ol>
          </section>
        ))}
        {!days.length && <p className="py-20 text-12.5 text-faint">No changes yet. Edits to this project show up here as you make them.</p>}
      </div>
    </aside>
  );
}
