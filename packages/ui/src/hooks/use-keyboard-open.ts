import { useSyncExternalStore } from 'react';

/** The on-screen keyboard takes at least this much height. */
const KEYBOARD_MIN_PX = 150;

function isTyping(): boolean {
  const element = document.activeElement;
  if (!(element instanceof HTMLElement)) return false;
  return (
    element.isContentEditable ||
    element.matches('input:not([type=checkbox],[type=radio],[type=button],[type=submit]), textarea, select')
  );
}

function read(): boolean {
  const viewport = window.visualViewport;
  if (!viewport) return false;
  return window.innerHeight - viewport.height > KEYBOARD_MIN_PX && isTyping();
}

function subscribe(onChange: () => void): () => void {
  const viewport = window.visualViewport;
  viewport?.addEventListener('resize', onChange);
  window.addEventListener('focusin', onChange);
  window.addEventListener('focusout', onChange);
  return () => {
    viewport?.removeEventListener('resize', onChange);
    window.removeEventListener('focusin', onChange);
    window.removeEventListener('focusout', onChange);
  };
}

/** True while the on-screen keyboard is up (the visual viewport is much shorter than the window). */
export function useKeyboardOpen(): boolean {
  return useSyncExternalStore(subscribe, read, () => false);
}
