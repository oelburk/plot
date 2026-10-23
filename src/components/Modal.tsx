import { useEffect, useRef, type ReactNode } from 'react';
import { focusSoon } from '../lib/focus';

export function Modal({ onClose, label, width, top, className = 'rounded-16', children }: { onClose: () => void; label: string; width: number; top: number; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const pressedBackdrop = useRef(false);
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    // captured here, not during render, so a modal that replaces another one sees the focus the first one handed back
    opener.current ??= document.activeElement as HTMLElement | null;
    const d = ref.current;
    if (d && !d.open) d.showModal();
    d?.querySelector('input')?.focus();
    // an input the closing action autofocused (a new project's add-task) must keep focus; an opener the action removed falls back to the heading
    return () => {
      const a = document.activeElement;
      if (a && a !== document.body) return;
      if (opener.current?.isConnected) opener.current.focus();
      else focusSoon('main h1');
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={label}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onMouseDown={(e) => (pressedBackdrop.current = e.target === e.currentTarget)}
      onMouseUp={(e) => (pressedBackdrop.current &&= e.target === e.currentTarget)}
      onClick={(e) => {
        if (pressedBackdrop.current && e.target === e.currentTarget) onClose();
      }}
      style={{ paddingTop: top }}
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none items-start justify-center bg-transparent px-24 pb-24 text-fg open:flex backdrop:bg-[rgba(6,7,9,0.6)] backdrop:[backdrop-filter:blur(3px)]"
    >
      <div className={`flex max-w-full flex-col overflow-hidden border border-white/9 bg-overlay shadow-overlay ${className}`} style={{ width }}>
        {children}
      </div>
    </dialog>
  );
}
