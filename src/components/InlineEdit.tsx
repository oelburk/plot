import { useState } from 'react';
import { focusSoon, isImeKey } from '../lib/focus';

/** `returnTo` is a selector for where focus goes after Enter or Esc; blurring away leaves focus wherever the user put it. */
export function InlineEdit({ value, onSave, onDone, returnTo, className = '' }: { value: string; onSave: (v: string) => void; onDone: () => void; returnTo: string; className?: string }) {
  const [draft, setDraft] = useState(value);
  const finish = (save: boolean) => {
    if (save && draft.trim() && draft.trim() !== value) onSave(draft);
    onDone();
  };
  const finishWithKey = (save: boolean) => {
    finish(save);
    focusSoon(returnTo);
  };
  return (
    <input
      autoFocus
      value={draft}
      aria-label="Name"
      onChange={(e) => setDraft(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={() => finish(false)}
      onKeyDown={(e) => {
        if (isImeKey(e)) return;
        if (e.key === 'Enter') {
          e.preventDefault();
          finishWithKey(true);
        } else if (e.key === 'Escape') {
          e.stopPropagation();
          finishWithKey(false);
        }
      }}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      className={`min-w-0 rounded-7 border border-white/12 bg-inset px-8 py-2 text-fg outline-none ${className}`}
    />
  );
}
