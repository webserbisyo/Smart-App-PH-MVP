import { useSyncExternalStore } from 'react';

/** The on-screen keyboard takes at least this much height. */
const KEYBOARD_MIN_PX = 150;

function read(): number {
  const viewport = window.visualViewport;
  if (!viewport) return 0;
  const covered = window.innerHeight - (viewport.height + viewport.offsetTop);
  return covered > KEYBOARD_MIN_PX ? Math.round(covered) : 0;
}

function subscribe(onChange: () => void): () => void {
  const viewport = window.visualViewport;
  viewport?.addEventListener('resize', onChange);
  viewport?.addEventListener('scroll', onChange);
  return () => {
    viewport?.removeEventListener('resize', onChange);
    viewport?.removeEventListener('scroll', onChange);
  };
}

/** How many pixels the on-screen keyboard covers at the bottom of the window (0 when it is closed). */
export function useKeyboardInset(): number {
  return useSyncExternalStore(subscribe, read, () => 0);
}
