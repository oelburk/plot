import { MoreHorizontal } from 'lucide-react';
import { useId, useRef, type KeyboardEvent, type MouseEvent } from 'react';

export interface MenuItem {
  label: string;
  onSelect: () => void;
  danger?: boolean;
}

export function Menu({ label, items, className = '' }: { label: string; items: MenuItem[]; className?: string }) {
  const id = useId();
  const pop = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  // ponytail: placed once on click; it doesn't flip near the bottom of the viewport or follow scroll
  const place = (e: MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    pop.current?.style.setProperty('top', `${r.bottom + 4}px`);
    pop.current?.style.setProperty('right', `${window.innerWidth - r.right}px`);
  };
  const entries = () => [...(pop.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      // Safari doesn't focus a button on click, so the popover can't restore focus to the trigger itself; stopPropagation keeps the app's Esc handler from also running
      e.stopPropagation();
      pop.current?.hidePopover();
      trigger.current?.focus();
      return;
    }
    const all = entries();
    const i = all.indexOf(document.activeElement as HTMLElement);
    const to = e.key === 'ArrowDown' ? (i + 1) % all.length : e.key === 'ArrowUp' ? (i - 1 + all.length) % all.length : e.key === 'Home' ? 0 : e.key === 'End' ? all.length - 1 : -1;
    if (to < 0) return;
    e.preventDefault();
    all[to].focus();
  };
  return (
    <span className={`flex ${className}`} onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
      <button
        ref={trigger}
        type="button"
        popoverTarget={id}
        onClick={place}
        aria-label={label}
        className="flex size-24 items-center justify-center rounded-6 text-tertiary hover:bg-white/6 hover:text-fg"
      >
        <MoreHorizontal size={14} strokeWidth={1.5} />
      </button>
      <div
        ref={pop}
        id={id}
        popover="auto"
        role="menu"
        onToggle={(e) => e.newState === 'open' && entries()[0]?.focus()}
        onKeyDown={onKeyDown}
        className="fixed inset-auto m-0 min-w-140 flex-col rounded-10 border border-white/9 bg-overlay p-4 text-strong shadow-overlay open:flex"
      >
        {items.map((it) => (
          <button
            key={it.label}
            type="button"
            role="menuitem"
            onClick={() => {
              pop.current?.hidePopover();
              it.onSelect();
            }}
            className={`rounded-6 px-10 py-7 text-left text-12.5 hover:bg-white/7 focus-visible:bg-white/7 ${it.danger ? 'hover:text-danger-fg focus-visible:text-danger-fg' : 'hover:text-fg focus-visible:text-fg'}`}
          >
            {it.label}
          </button>
        ))}
      </div>
    </span>
  );
}
