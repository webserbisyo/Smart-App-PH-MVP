import { useEffect, useRef } from 'react';

import { IconCheck, IconGift } from '@tabler/icons-react';
import confetti from 'canvas-confetti';

import { Progress } from '#components/progress';
import { cn } from '#lib/utils';

export interface StampCardWords {
  title: string;
  count: (stamps: number, goal: number) => string;
  toGo: (left: number, reward: string) => string;
  ready: string;
  readyText: (reward: string) => string;
}

export interface StampCardProps {
  /** Stamps on the card now (a reward resets it). */
  stamps: number;
  /** Stamps for one reward (the shop's stamp rule). */
  goal: number;
  /** "a free drink", "₱100 off". */
  reward: string;
  words: StampCardWords;
  /** Fire the confetti when the reward is ready (off where the same card is shown twice). */
  celebrate?: boolean;
  className?: string;
}

/** Marigold for the one celebration in the app (paper 9.2); member green for the stamps. */
const CONFETTI_COLORS = ['#f9c635', '#ecb91e', '#08775f', '#ffffff'];

/**
 * The member's stamp card: filled and empty circles in member green and "2 more to a free drink". When the reward is
 * ready it says so and fires one confetti burst, once per mount, never on a re-render.
 */
export function StampCard({ stamps, goal, reward, words, celebrate = true, className }: StampCardProps) {
  const filled = Math.min(stamps, goal);
  const ready = goal > 0 && stamps >= goal;
  const fired = useRef(false);

  useEffect(() => {
    if (!ready || !celebrate || fired.current) return;
    fired.current = true;
    void confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 }, colors: CONFETTI_COLORS, disableForReducedMotion: true });
  }, [ready, celebrate]);

  return (
    <section
      aria-label={words.title}
      data-ready={ready || undefined}
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-member/20 bg-member-soft p-4 text-member-soft-foreground',
        ready && 'border-highlight bg-highlight-soft text-highlight-soft-foreground',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">{ready ? words.ready : words.title}</h3>
        <span className="tabular text-sm">{words.count(filled, goal)}</span>
      </div>
      <ol className="grid grid-cols-5 gap-2" aria-hidden="true">
        {Array.from({ length: goal }, (_, index) => {
          const on = index < filled;
          const last = index === goal - 1;
          return (
            <li
              key={index}
              className={cn(
                'flex aspect-square max-w-12 items-center justify-center rounded-full border-2',
                on ? 'border-member bg-member text-member-foreground' : 'border-member/30 border-dashed',
                ready && on && 'border-highlight bg-highlight text-highlight-foreground',
              )}
            >
              {on ? <IconCheck className="size-1/2" /> : last ? <IconGift className="size-1/2 opacity-60" /> : null}
            </li>
          );
        })}
      </ol>
      {!ready && <Progress value={goal > 0 ? (filled / goal) * 100 : 0} aria-label={words.count(filled, goal)} className="[&_[data-slot=progress-indicator]]:bg-member" />}
      <p className="text-sm font-medium">{ready ? words.readyText(reward) : words.toGo(goal - filled, reward)}</p>
    </section>
  );
}
