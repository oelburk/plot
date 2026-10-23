import { useEffect, useState } from 'react';
import { focusSoon } from '../lib/focus';
import { useStore } from '../store';

export function Toast() {
  const undo = useStore((s) => s.undo);
  return undo && <UndoToast key={undo.at} label={undo.label} />;
}

function UndoToast({ label }: { label: string }) {
  const { undoDelete, dismissUndo } = useStore.getState();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const paused = hovered || focused;
  // hovering or keyboard-focusing the toast holds it open; leaving restarts the full 6s. A mouse delete moves focus to Undo, which mustn't hold it.
  useEffect(() => {
    if (paused) return;
    const t = setTimeout(dismissUndo, 6000);
    return () => clearTimeout(t);
  }, [paused, dismissUndo]);
  return (
    <div
      role="status"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={(e) => setFocused(e.target.matches(':focus-visible'))}
      onBlur={() => setFocused(false)}
      className="fixed bottom-24 left-1/2 z-40 flex -translate-x-1/2 items-center gap-14 rounded-10 border border-white/9 bg-overlay py-8 pl-14 pr-8 text-12.5 text-strong shadow-overlay"
    >
      <span className="max-w-360 truncate">{label}</span>
      <button
        type="button"
        data-undo
        onClick={() => {
          undoDelete();
          focusSoon('main h1');
        }}
        className="rounded-6 px-9 py-4 font-medium text-fg hover:bg-white/7"
      >
        Undo
      </button>
    </div>
  );
}
