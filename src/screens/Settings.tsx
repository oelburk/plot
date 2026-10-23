import { useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { btn, fieldRing, Segmented, Switch } from '../components/ui';
import { discColor, discTint, genTag, nextHue, SWATCH_HUES, usageCount } from '../lib/disciplines';
import { saveTextFile } from '../lib/files';
import { focusSoon, isImeKey } from '../lib/focus';
import { plural } from '../lib/format';
import { exportCsv, exportJson, parseImport } from '../lib/io';
import { allTasks } from '../lib/progress';
import type { Discipline, Project } from '../lib/types';
import { useStore } from '../store';

/** Esc dismisses an inline confirmation instead of reaching the app's own Esc handling. */
const onEsc = (cancel: () => void) => (e: KeyboardEvent) => {
  if (e.key !== 'Escape') return;
  e.stopPropagation();
  cancel();
};

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-10">
      <span className="pl-2 font-mono text-10.5 font-medium leading-[normal] tracking-[0.08em] text-label">{label}</span>
      <div className="flex flex-col divide-y divide-white/5 overflow-hidden rounded-14 border border-white/6 bg-card">{children}</div>
    </div>
  );
}

function Row({ title, desc, error = false, onKeyDown, children }: { title: string; desc: string; error?: boolean; onKeyDown?: (e: KeyboardEvent) => void; children: ReactNode }) {
  return (
    <div onKeyDown={onKeyDown} className="flex items-center justify-between gap-20 px-18 py-16">
      <div className="flex flex-col gap-3">
        <span className="text-13.5 font-medium">{title}</span>
        <span className={`text-12.5 ${error ? 'text-danger-fg' : 'text-muted'}`}>{desc}</span>
      </div>
      <div className="flex shrink-0 gap-6">{children}</div>
    </div>
  );
}

export function Settings() {
  // projects and disciplines are only selected so the storage size below recomputes whenever either is saved
  const s = useStore(
    useShallow((x) => ({ projects: x.projects, disciplines: x.disciplines, view: x.view, toggleStyle: x.toggleStyle, detail: x.detail, showDisc: x.showDisc, hideDone: x.hideDone })),
  );
  const { patch } = useStore.getState();
  const [exportError, setExportError] = useState('');
  const save = (name: string, text: string, mime: string) =>
    saveTextFile(name, text, mime).then(
      () => setExportError(''),
      (e) => setExportError(`Couldn't save the file. ${e}`),
    );
  const kb = ((localStorage.getItem('plot.v1')?.length ?? 0) / 1024).toFixed(1);

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="mx-auto flex max-w-760 flex-col gap-34 px-36 pb-72 pt-44">
        <div data-tauri-drag-region className="flex flex-col gap-6">
          <h1 tabIndex={-1} className="text-26 font-semibold leading-[1.15] tracking-[-0.025em] outline-none">Settings</h1>
          <span className="text-13 text-muted">Everything lives on this computer. No account, no sync, no tracking.</span>
        </div>

        <Section label="DATA">
          <Row title="Storage" desc="Saved on this computer as you type.">
            <span className="rounded-6 bg-white/4 px-8 py-4 font-mono text-11.5 font-medium leading-[normal] text-secondary">plot.v1 · {kb} KB</span>
          </Row>
          <Row title="Export" desc={exportError || 'All projects, epics, tasks and notes.'} error={!!exportError}>
            <button type="button" className={btn.secondary} onClick={() => save('plot-export.json', exportJson(useStore.getState()), 'application/json')}>
              JSON
            </button>
            <button type="button" className={btn.secondary} onClick={() => save('plot-export.csv', exportCsv(useStore.getState()), 'text/csv')}>
              CSV
            </button>
          </Row>
          <ImportRow />
        </Section>

        <Section label="DEFAULTS">
          <Row title="Project view" desc="Which view a project opens in.">
            <Segmented wide value={s.view} onChange={(v) => patch({ view: v })} options={[{ value: 'tree', label: 'Tree' }, { value: 'map', label: 'Map' }]} />
          </Row>
          <Row title="Status toggle" desc="Show labels, or just the ○ ◐ ● glyphs.">
            <Segmented wide value={s.toggleStyle} onChange={(v) => patch({ toggleStyle: v })} options={[{ value: 'labels', label: 'Labels' }, { value: 'glyphs', label: 'Glyphs' }]} />
          </Row>
          <Row title="Epic rows in the tree" desc="Progress bar, task squares by discipline, or a discipline level.">
            <Segmented
              wide
              value={s.detail}
              onChange={(v) => patch({ detail: v })}
              options={[{ value: 'bar', label: 'Bar' }, { value: 'squares', label: 'Squares' }, { value: 'grouped', label: 'Grouped' }]}
            />
          </Row>
          <Row title="Discipline breakdown" desc="Per-discipline % in the project header.">
            <Switch big label="Discipline breakdown" on={s.showDisc} onChange={(v) => patch({ showDisc: v })} />
          </Row>
          <Row title="Hide done tasks" desc="Keep finished work out of the tree.">
            <Switch big label="Hide done tasks" on={s.hideDone} onChange={(v) => patch({ hideDone: v })} />
          </Row>
        </Section>

        <Section label="DISCIPLINES">
          <Disciplines />
        </Section>

        <ResetCard />
      </div>
    </div>
  );
}

function ImportRow() {
  const { replaceData } = useStore.getState();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ file: string; projects: Project[]; disciplines?: Discipline[] } | null>(null);
  const [error, setError] = useState('');

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const r = await file.text().then(parseImport, () => ({ ok: false as const, error: "Couldn't read that file." }));
    setPending(r.ok ? { file: file.name, projects: r.projects, disciplines: r.disciplines } : null);
    setError(r.ok ? '' : r.error);
  };
  const leave = () => {
    setPending(null);
    focusSoon('[data-import]');
  };

  if (pending) {
    const tasks = pending.projects.flatMap(allTasks).length;
    return (
      <Row
        key="confirm"
        title="Import"
        desc={`Replace all data with ${pending.file} (${plural(pending.projects.length, 'project')}, ${plural(tasks, 'task')})?`}
        onKeyDown={onEsc(leave)}
      >
        <button type="button" autoFocus className={btn.ghost} onClick={leave}>
          Cancel
        </button>
        <button
          type="button"
          className={btn.danger}
          onClick={() => {
            replaceData(pending.projects, pending.disciplines);
            leave();
          }}
        >
          Replace
        </button>
      </Row>
    );
  }
  return (
    <Row key="choose" title="Import" desc={error || 'Replace current data with a Plot JSON export.'} error={!!error}>
      <button type="button" data-import className={`${btn.secondary} leading-[1.45]`} onClick={() => fileInput.current?.click()}>
        Choose file…
      </button>
      <input ref={fileInput} type="file" accept=".json,application/json" onChange={onFile} hidden />
    </Row>
  );
}

function DisciplineRow({ d, others, n, removable }: { d: Discipline; others: string[]; n: number; removable: boolean }) {
  const { updateDiscipline, removeDiscipline } = useStore.getState();
  // null while the input isn't being edited, so it follows the store; the store rejects empty and taken values, so intermediate input stays local
  const [name, setName] = useState<string | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const commitName = () => {
    if (name?.trim() && name.trim() !== d.name) updateDiscipline(d.code, { name: name.trim() });
    setName(null);
  };
  const commitTag = () => {
    if (tag === null) return;
    const taken = others.map((t) => t.toLowerCase());
    const next = tag && !taken.includes(tag.toLowerCase()) ? tag : d.tag;
    if (next !== d.tag) updateDiscipline(d.code, { tag: next });
    setTag(null);
  };
  const keys = (commit: () => void, revert: () => void) => (e: KeyboardEvent) => {
    if (isImeKey(e)) return;
    if (e.key === 'Enter') commit();
    else if (e.key === 'Escape') {
      e.stopPropagation();
      revert();
    }
  };

  return (
    <div className="flex items-center gap-12 py-10 pl-18 pr-14">
      <input
        value={tag ?? d.tag}
        title="Short code (max 3)"
        aria-label={`${d.name} short code`}
        onChange={(e) => setTag(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3))}
        onBlur={commitTag}
        onKeyDown={keys(commitTag, () => setTag(null))}
        className={`w-38 rounded-4 py-4 text-center font-mono text-10 font-medium outline-none ${fieldRing}`}
        style={{ color: discColor(d.hue), background: discTint(d.hue) }}
      />
      <input
        value={name ?? d.name}
        aria-label={`${d.name} discipline name`}
        onChange={(e) => setName(e.target.value)}
        onBlur={commitName}
        onKeyDown={keys(commitName, () => setName(null))}
        className={`min-w-0 flex-1 rounded-7 border border-transparent bg-transparent px-10 py-6 text-13 text-fg outline-none hover:border-white/10 focus:border-white/18 ${fieldRing}`}
      />
      <div className="flex gap-8 px-6">
        {SWATCH_HUES.map((h) => (
          <button
            key={String(h)}
            type="button"
            aria-label={`${d.name} color ${h ?? 'neutral'}`}
            aria-pressed={d.hue === h}
            onClick={() => updateDiscipline(d.code, { hue: h })}
            className="size-12 rounded-full"
            style={{ background: discColor(h), boxShadow: d.hue === h ? `0 0 0 2px var(--color-card), 0 0 0 3.5px ${discColor(h)}` : 'none' }}
          />
        ))}
      </div>
      <span className="w-64 text-right text-12 text-faint">{n ? plural(n, 'task') : 'Unused'}</span>
      {removable ? (
        <button
          type="button"
          title="Remove"
          aria-label={`Remove ${d.name}`}
          onClick={() => removeDiscipline(d.code)}
          className="size-24 rounded-6 text-15 leading-none text-tertiary hover:bg-white/6 hover:text-danger-fg"
        >
          ×
        </button>
      ) : (
        <span
          role="img"
          aria-label={`Can't remove ${d.name}: ${n ? 'move its tasks to another discipline first' : 'keep at least one discipline'}`}
          title={n ? 'Move its tasks to another discipline to remove it' : 'Keep at least one discipline'}
          className="flex size-24 items-center justify-center text-15 text-dim"
        >
          ×
        </span>
      )}
    </div>
  );
}

function Disciplines() {
  const disciplines = useStore((s) => s.disciplines);
  const projects = useStore((s) => s.projects);
  const { addDiscipline } = useStore.getState();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const hue = nextHue(disciplines.map((d) => d.hue));
  const add = () => {
    if (!draft.trim()) return;
    addDiscipline(draft);
    setDraft('');
  };
  const cancel = () => {
    setAdding(false);
    setDraft('');
    focusSoon('[data-add-discipline]');
  };

  return (
    <>
      {disciplines.map((d) => {
        const n = usageCount(projects, d.code);
        return (
          <DisciplineRow
            key={d.code}
            d={d}
            others={disciplines.filter((x) => x.code !== d.code).map((x) => x.tag)}
            n={n}
            removable={!n && disciplines.length > 1}
          />
        );
      })}
      {adding ? (
        <div className="flex items-center gap-12 py-10 pl-18 pr-14">
          <span className="w-38 rounded-4 py-4 text-center font-mono text-10 font-medium leading-[normal]" style={{ color: discColor(hue), background: discTint(hue) }}>
            {genTag(draft || 'New', disciplines.map((d) => d.tag))}
          </span>
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (isImeKey(e)) return;
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              } else if (e.key === 'Escape') {
                e.stopPropagation();
                cancel();
              }
            }}
            placeholder="Discipline name, e.g. QA"
            aria-label="New discipline name"
            className={`min-w-0 flex-1 rounded-7 border border-white/12 bg-inset px-10 py-6 text-13 text-fg outline-none focus:border-white/18 ${fieldRing}`}
          />
          <button type="button" className={btn.ghost} onClick={cancel}>
            Cancel
          </button>
          <button type="button" className={btn.primary} onClick={add}>
            Add
          </button>
        </div>
      ) : (
        <button type="button" data-add-discipline onClick={() => setAdding(true)} className="flex w-full items-center gap-12 px-18 py-13 text-left text-13 text-muted hover:text-fg focus-visible:-outline-offset-2">
          <span className="w-38 text-center">+</span>Add discipline
        </button>
      )}
    </>
  );
}

function ResetCard() {
  const { reset } = useStore.getState();
  const [confirming, setConfirming] = useState(false);
  const cancel = () => {
    setConfirming(false);
    focusSoon('[data-reset]');
  };
  return (
    <div onKeyDown={confirming ? onEsc(cancel) : undefined} className="flex items-center justify-between gap-20 rounded-14 border border-danger/25 px-18 py-16">
      <div className="flex flex-col gap-3">
        <span className="text-13.5 font-medium">Reset to sample data</span>
        <span className="text-12.5 text-muted">
          {confirming ? 'Reset everything? Projects and disciplines go back to the sample data.' : 'Wipes everything stored locally. Export first.'}
        </span>
      </div>
      <div className="flex shrink-0 gap-6">
        {confirming && (
          <button type="button" autoFocus className={btn.ghost} onClick={cancel}>
            Cancel
          </button>
        )}
        <button type="button" data-reset className={btn.danger} onClick={
            confirming
              ? () => {
                  reset();
                  focusSoon('main h1');
                }
              : () => setConfirming(true)
          }>
          Reset
        </button>
      </div>
    </div>
  );
}
