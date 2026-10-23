import type { ReactNode } from 'react';
import { discColor, discTint } from '../lib/disciplines';
import { width, type Stats } from '../lib/progress';
import { DOING, DONE, STATUS_LABELS, TODO, type Discipline, type Status, type Task } from '../lib/types';
import { useStore } from '../store';

export const btn = {
  primary: 'rounded-7 bg-fg px-12 py-6 text-12.5 font-medium text-app hover:bg-white',
  secondary: 'rounded-7 border border-white/10 bg-raised px-12 py-6 text-12.5 text-fg hover:border-white/20',
  danger: 'rounded-7 border border-danger/40 px-12 py-6 text-12.5 text-danger-fg hover:bg-danger/10',
  ghost: 'rounded-7 px-10 py-6 text-12.5 text-secondary hover:text-fg',
};

/** Focus ring for text fields; index.css removes their outline. */
export const fieldRing = 'focus:shadow-[0_0_0_2px_oklch(0.78_0.1_250/0.6)]';

export const squareBg = (s: Status) =>
  s === DONE ? 'var(--color-done)' : s === DOING ? 'var(--color-doing)' : 'rgba(255,255,255,0.03)';

export function DisciplineTag({ d, w = 32, className = '' }: { d: Discipline; w?: number; className?: string }) {
  return (
    <span
      className={`shrink-0 rounded-4 py-2 text-center font-mono text-10 font-medium ${className}`}
      style={{ width: w, color: discColor(d.hue), background: discTint(d.hue) }}
    >
      {d.tag}
    </span>
  );
}

export function Pct({ value, complete = false, className, unitClass }: { value: number; complete?: boolean; className: string; unitClass: string }) {
  return (
    <span className={`shrink-0 font-mono font-medium tracking-[-0.05em] ${complete ? 'text-done-fg' : 'text-fg'} ${className}`}>
      {value}
      <span className={`tracking-normal text-faint ${unitClass}`}>%</span>
    </span>
  );
}

export function StackedBar({ s, className, soft = false }: { s: Stats; className: string; soft?: boolean }) {
  return (
    <div className={`flex overflow-hidden rounded-full bg-white/6 ${className}`}>
      <span className="bg-done transition-[width] duration-300" style={{ width: width(s.done, s.total) }} />
      <span className={`transition-[width] duration-300 ${soft ? 'bg-doing/50' : 'bg-doing'}`} style={{ width: width(s.doing, s.total) }} />
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, small = false, wide = false }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; small?: boolean; wide?: boolean }) {
  return (
    <div className={`flex border border-white/7 bg-inset p-2 ${small ? 'rounded-7' : 'rounded-8'}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`flex items-center gap-7 ${small ? 'rounded-5 px-9 py-3 text-11.5' : `rounded-6 py-5 text-12 ${wide ? 'px-12' : 'px-11'}`} ${value === o.value ? 'bg-white/10 text-fg' : 'text-tertiary'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ on, onChange, big = false, label, children }: { on: boolean; onChange: (v: boolean) => void; big?: boolean; label?: string; children?: ReactNode }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className="flex items-center gap-8 text-12 text-tertiary">
      <span className={`flex shrink-0 rounded-full p-2 transition-[background-color] duration-150 ${big ? 'h-18 w-32' : 'h-15 w-26'} ${on ? 'justify-end bg-done' : 'justify-start bg-white/14'}`}>
        <span className={`rounded-full bg-fg ${big ? 'size-14' : 'size-11'}`} />
      </span>
      {children}
    </button>
  );
}

export function Glyph({ s }: { s: Status }) {
  if (s === DONE) return <span className="size-10 shrink-0 rounded-full bg-current" />;
  return (
    <span
      className="size-10 shrink-0 rounded-full border-[1.5px] border-current"
      style={s === DOING ? { padding: 1.5, background: 'conic-gradient(currentColor 0 50%, transparent 50% 100%) content-box' } : undefined}
    />
  );
}

const ACTIVE = ['bg-white/9 text-fg', 'bg-doing/16 text-doing-fg', 'bg-done/16 text-done-fg'];

export function StatusToggle({ value, onChange, labels, inPanel = false }: { value: Status; onChange: (s: Status) => void; labels: boolean; inPanel?: boolean }) {
  return (
    <div role="group" aria-label="Status" className={`flex shrink-0 gap-1 rounded-8 border border-white/7 p-2 ${inPanel ? 'bg-search' : 'bg-inset'}`}>
      {([TODO, DOING, DONE] as const).map((s) => (
        <button
          key={s}
          type="button"
          title={STATUS_LABELS[s]}
          aria-label={STATUS_LABELS[s]}
          aria-pressed={value === s}
          onClick={() => onChange(s)}
          className={`flex items-center gap-6 whitespace-nowrap rounded-6 px-9 py-4 text-11.5 transition-[background-color] duration-120 ${value === s ? ACTIVE[s] : 'text-muted'}`}
        >
          <Glyph s={s} />
          {labels && <span>{STATUS_LABELS[s]}</span>}
        </button>
      ))}
    </div>
  );
}

export function Ring({ pct }: { pct: number }) {
  return (
    <span
      className="size-14 shrink-0 rounded-full"
      style={{
        background: `conic-gradient(var(--color-done) ${pct}%, rgba(255,255,255,0.13) 0)`,
        mask: 'radial-gradient(circle at center, transparent 3.5px, #000 4px)',
      }}
    />
  );
}

export const hasNotes = (t: Task) => !!t.notes.trim() || !!t.comments?.length;

export function NotesIcon() {
  return (
    <span title="Has notes or comments" className="flex shrink-0 flex-col gap-2">
      <span className="h-[1.5px] w-9 bg-faint" />
      <span className="h-[1.5px] w-9 bg-faint" />
      <span className="h-[1.5px] w-6 bg-faint" />
    </span>
  );
}

export function Kbd({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <span className={`rounded-4 border border-white/8 py-2 font-mono text-10.5 font-medium text-tertiary ${wide ? 'px-6' : 'px-5'}`}>
      {children}
    </span>
  );
}

export function OwnerPills({ value, onChange, short = false, compact = false }: { value: string; onChange: (code: string) => void; short?: boolean; compact?: boolean }) {
  const disciplines = useStore((s) => s.disciplines);
  return disciplines.map((d) => (
    <button
      key={d.code}
      type="button"
      aria-pressed={value === d.code}
      onClick={() => onChange(d.code)}
      onMouseDown={short ? (e) => e.preventDefault() : undefined}
      className={`border border-white/8 text-tertiary ${short ? 'w-34 shrink-0 rounded-5 py-3 font-mono text-10 font-medium' : compact ? 'rounded-6 px-8 py-3 text-11' : 'rounded-6 px-9 py-3 text-11.5'}`}
      style={value === d.code ? { color: discColor(d.hue), background: discTint(d.hue), borderColor: 'transparent' } : undefined}
    >
      {short ? d.tag : d.name}
    </button>
  ));
}
