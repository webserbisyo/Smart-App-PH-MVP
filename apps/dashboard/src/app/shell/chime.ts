// The new-order chime (ux-plan 3.5), made with Web Audio so there is no sound file. Browsers block sound until the
// person taps the page once, so the shell shows "Turn on order sound" until the sound is unlocked.

let context: AudioContext | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

/** Whether the chime can play now. */
export function soundReady(): boolean {
  return context?.state === 'running';
}

export function subscribeSound(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Unlocks the sound; call it from a tap. */
export async function enableSound(): Promise<void> {
  if (typeof AudioContext === 'undefined') return;
  context ??= new AudioContext();
  context.onstatechange = notify;
  await context.resume();
  notify();
}

/** Two short bright notes. Silent while the sound is locked. */
export function playChime(): void {
  if (context === null || context.state !== 'running') return;
  const start = context.currentTime;
  for (const [index, frequency] of [880, 1318.5].entries()) {
    const at = start + index * 0.16;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.35, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.4);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(at);
    oscillator.stop(at + 0.42);
  }
}
