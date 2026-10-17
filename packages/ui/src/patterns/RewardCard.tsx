'use client';

import { useEffect, useRef } from 'react';
import { IconCheck, IconGift, IconSparkles, IconStarFilled } from '@tabler/icons-react';
import confetti from 'canvas-confetti';

import { DotPattern } from '#components/dot-pattern';
import { ShineBorder } from '#components/shine-border';
import { cn } from '#lib/utils';

export interface RewardCardProps {
  /** Stamps on the card now. */
  stamps: number;
  /** Stamps needed for one reward (default 10). */
  goal?: number;
  /** Reward description (e.g. "₱100 off your order", "Free Latte"). */
  reward?: string;
  /** Image URL of the reward prize or free item. */
  rewardImageUrl?: string | null | undefined;
  /** Kind of reward. */
  rewardKind?: 'discount' | 'free_item' | 'custom' | undefined;
  /** Shop logo URL (if available). */
  logoUrl?: string | null | undefined;
  /** Shop name. */
  shopName: string;
  /** Whether member is signed in. */
  signedIn?: boolean | undefined;
  /** Join action when signed out. */
  onJoin?: (() => void) | undefined;
  /** Fire celebration confetti when reward is ready (defaults to true). */
  celebrate?: boolean | undefined;
  className?: string | undefined;
}

const CONFETTI_COLORS = ['#f9c635', '#ecb91e', '#ffffff', '#08775f'];

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    const first = parts[0]?.charAt(0) ?? '';
    const second = parts[1]?.charAt(0) ?? '';
    return (first + second).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Storefront v2 RewardCard:
 * Replaces StampCard. Gift-card ratio (1.586:1), shop-10 gradient, dot-pattern,
 * logo, stamp grid with a 300 ms CSS thunk on newly earned stamp, shine-border
 * and confetti once when the reward is ready, and "N more to <reward>" progress line.
 */
export function RewardCard({
  stamps,
  goal = 10,
  reward = '₱100 off',
  rewardImageUrl,
  logoUrl,
  shopName,
  signedIn = true,
  onJoin,
  celebrate = true,
  className,
}: RewardCardProps) {
  const filled = Math.min(stamps, goal);
  const ready = goal > 0 && stamps >= goal;
  const left = Math.max(0, goal - filled);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!ready || !celebrate || firedRef.current) return;
    firedRef.current = true;
    void confetti({
      particleCount: 90,
      spread: 70,
      origin: { y: 0.6 },
      colors: CONFETTI_COLORS,
      disableForReducedMotion: true,
    });
  }, [ready, celebrate]);

  if (!signedIn) {
    return (
      <section
        aria-label="Member Rewards"
        className={cn(
          'relative flex flex-col justify-between overflow-hidden rounded-[var(--radius-card,1.25rem)] p-5 text-shop-10-foreground shadow-lg',
          'aspect-[1.586/1] bg-gradient-to-br from-shop-10 via-shop-10 to-shop-10-hover',
          className,
        )}
      >
        <DotPattern
          width={16}
          height={16}
          cx={1}
          cy={1}
          cr={1}
          className="pointer-events-none absolute inset-0 size-full opacity-15 text-shop-10-foreground"
        />

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={shopName}
                className="size-9 rounded-full object-cover border border-white/20 shadow-xs"
              />
            ) : (
              <div className="flex size-9 items-center justify-center rounded-full bg-white/20 font-bold text-xs backdrop-blur">
                {initialsOf(shopName)}
              </div>
            )}
            <div>
              <p className="text-xs font-medium tracking-wide uppercase opacity-85">Member Club</p>
              <h3 className="text-base font-bold leading-tight">{shopName}</h3>
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold backdrop-blur">
            <IconSparkles className="size-3.5" />
            <span>1 free stamp</span>
          </div>
        </div>

        <div className="relative z-10 flex flex-col gap-1.5 my-auto">
          <p className="text-lg font-bold leading-tight sm:text-xl">Join and get 1 free stamp</p>
          <div className="flex items-center gap-2">
            {rewardImageUrl && (
              <img
                src={rewardImageUrl}
                alt=""
                className="size-7 shrink-0 rounded-md object-cover border border-white/20 shadow-xs"
              />
            )}
            <p className="text-xs opacity-90 leading-relaxed max-w-[280px]">
              Earn stamps on every order and unlock {reward}.
            </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between pt-1">
          <span className="text-xs opacity-80">Free to join · No password</span>
          {onJoin && (
            <button
              type="button"
              onClick={onJoin}
              className="pressable rounded-full bg-white px-4 py-2 text-xs font-bold text-shop-10 shadow-sm hover:bg-white/90 transition-colors"
            >
              Join Rewards
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Loyalty Reward Card"
      data-ready={ready || undefined}
      className={cn(
        'relative flex flex-col justify-between overflow-hidden rounded-[var(--radius-card,1.25rem)] p-4 sm:p-5 text-shop-10-foreground shadow-lg',
        'aspect-[1.586/1] bg-gradient-to-br from-shop-10 via-shop-10 to-shop-10-hover',
        className,
      )}
    >
      <DotPattern
        width={16}
        height={16}
        cx={1}
        cy={1}
        cr={1}
        className="pointer-events-none absolute inset-0 size-full opacity-15 text-shop-10-foreground"
      />

      {ready && (
        <ShineBorder
          borderWidth={2}
          duration={8}
          shineColor={['#ffffff', 'rgba(255, 255, 255, 0.4)', '#ffffff']}
        />
      )}

      {/* Top Header */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={shopName}
              className="size-8 sm:size-9 rounded-full object-cover border border-white/20 shadow-xs"
            />
          ) : (
            <div className="flex size-8 sm:size-9 items-center justify-center rounded-full bg-white/20 font-bold text-xs backdrop-blur">
              {initialsOf(shopName)}
            </div>
          )}
          <div>
            <p className="text-[10px] sm:text-xs font-medium tracking-wide uppercase opacity-85">Loyalty Rewards</p>
            <h3 className="text-sm sm:text-base font-bold leading-tight truncate max-w-[170px] sm:max-w-[220px]">
              {shopName}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold tabular backdrop-blur">
          {ready ? (
            <span className="flex items-center gap-1">
              <IconSparkles className="size-3.5" /> Ready!
            </span>
          ) : (
            <span>
              {String(filled)} / {String(goal)}
            </span>
          )}
        </div>
      </div>

      {/* Stamp Grid */}
      <div className="relative z-10 my-auto py-1">
        <ol className="grid grid-cols-5 gap-2 sm:gap-2.5" aria-label={`Stamps: ${String(filled)} of ${String(goal)}`}>
          {Array.from({ length: goal }).map((_, index) => {
            const isEarned = index < filled;
            const isLatest = index === filled - 1;
            const isLastGoal = index === goal - 1;

            return (
              <li
                key={index}
                className={cn(
                  'flex aspect-square max-w-10 sm:max-w-11 items-center justify-center rounded-full border-2 transition-transform',
                  isEarned
                    ? 'border-white bg-white text-shop-10 shadow-sm'
                    : 'border-white/35 border-dashed bg-white/10 text-white/50',
                  isLatest && isEarned && 'animate-thunk',
                )}
              >
                {isEarned ? (
                  isLastGoal ? (
                    <IconStarFilled className="size-4 sm:size-5" />
                  ) : (
                    <IconCheck className="size-4 sm:size-5 stroke-[2.5]" />
                  )
                ) : isLastGoal ? (
                  <IconGift className="size-4 sm:size-5 opacity-70" />
                ) : (
                  <span className="text-[11px] font-bold tabular opacity-60">{index + 1}</span>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {/* Bottom Footer Line */}
      <div className="relative z-10 flex items-center justify-between gap-2 text-xs sm:text-sm font-semibold">
        <div className="flex items-center gap-2 min-w-0">
          {rewardImageUrl ? (
            <img
              src={rewardImageUrl}
              alt=""
              className="size-7 sm:size-8 shrink-0 rounded-md object-cover border border-white/20 shadow-xs"
            />
          ) : null}
          {ready ? (
            <p className="flex items-center gap-1.5 text-white drop-shadow-xs truncate">
              <IconSparkles className="size-4 shrink-0" />
              <span className="truncate">Reward Ready: <strong>{reward}</strong></span>
            </p>
          ) : (
            <p className="opacity-95 truncate">
              {left === 1 ? `1 more stamp to ${reward}` : `${String(left)} more stamps to ${reward}`}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
