'use client';

import { DotPattern } from '#components/dot-pattern';
import { cn } from '#lib/utils';

export interface BrandCardProps {
  name: string;
  tagline?: string | null | undefined;
  logoUrl?: string | null | undefined;
  className?: string | undefined;
}

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
 * Storefront v2 BrandCard:
 * Shown on the shop home in place of the banner carousel (when no banners are configured).
 * Features a 21:9 responsive ratio, shop-10 gradient, subtle dot pattern, logo/initials,
 * shop name, and tagline.
 */
export function BrandCard({ name, tagline, logoUrl, className }: BrandCardProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col justify-end overflow-hidden rounded-[var(--radius-card,1.25rem)] p-6 sm:p-8 text-shop-10-foreground shadow-sm',
        'min-h-[180px] sm:min-h-[220px] aspect-[21/9] bg-gradient-to-br from-shop-10 via-shop-10 to-shop-10-hover',
        className,
      )}
    >
      <DotPattern
        width={20}
        height={20}
        cx={1}
        cy={1}
        cr={1}
        className="pointer-events-none absolute inset-0 size-full opacity-15 text-shop-10-foreground"
      />

      <div className="relative z-10 flex items-center gap-4">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={name}
            className="size-16 sm:size-20 rounded-2xl object-cover border-2 border-white/25 shadow-md shrink-0 bg-white"
          />
        ) : (
          <div className="flex size-16 sm:size-20 items-center justify-center rounded-2xl bg-white/20 font-extrabold text-xl sm:text-2xl backdrop-blur shrink-0 border border-white/25 shadow-md">
            {initialsOf(name)}
          </div>
        )}

        <div className="flex flex-col gap-1 drop-shadow-xs">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
            {name}
          </h1>
          {tagline && (
            <p className="text-sm sm:text-base opacity-90 line-clamp-2 max-w-lg font-medium">
              {tagline}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
