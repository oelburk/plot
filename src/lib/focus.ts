import type { KeyboardEvent } from 'react';

/** Moves focus to the first match once React has committed; used to hand focus back to an opener after its panel closes. */
export const focusSoon = (selector: string) =>
  requestAnimationFrame(() => document.querySelector<HTMLElement>(selector)?.focus());

export const focusUndo = () => focusSoon('[data-undo]');

/** True while an IME composition is active; WebKit reports the confirming key as keyCode 229 with isComposing already false. */
export const isImeKey = (e: KeyboardEvent | globalThis.KeyboardEvent) => {
  const k = 'nativeEvent' in e ? e.nativeEvent : e;
  return k.isComposing || k.keyCode === 229;
};
