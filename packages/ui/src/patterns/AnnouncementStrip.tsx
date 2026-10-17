'use client';

import { useSyncExternalStore } from 'react';
import { IconAlertTriangle, IconFlame, IconInfoCircle } from '@tabler/icons-react';

import type { ShopAnnouncement } from '@smartapp/core';
import {
  Banner,
  BannerClose,
  BannerContent,
  BannerIcon,
  BannerTitle,
} from '#components/banner';
import { cn } from '#lib/utils';

export interface AnnouncementStripProps {
  announcement?: ShopAnnouncement | null | undefined;
  shopSlug: string;
  className?: string | undefined;
}

const STORAGE_PREFIX = 'smartapp:dismissed_announcement:';

function useDismissedAnnouncement(shopSlug: string, text: string | undefined): boolean {
  return useSyncExternalStore(
    (callback) => {
      window.addEventListener('storage', callback);
      return () => {
        window.removeEventListener('storage', callback);
      };
    },
    () => {
      if (!text) return true;
      try {
        return localStorage.getItem(`${STORAGE_PREFIX}${shopSlug}`) === text;
      } catch {
        return false;
      }
    },
    () => true, // SSR: don't flash before client hydrates
  );
}

function useIsAnnouncementExpired(endsAt: string | null | undefined): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => {
      if (!endsAt) return false;
      const expires = new Date(endsAt).getTime();
      return !Number.isNaN(expires) && expires < Date.now();
    },
    () => false, // SSR: deterministic
  );
}

/**
 * AnnouncementStrip pattern:
 * - Uses DiceUI banner component
 * - Tone color from status tokens (info, promo, warning)
 * - Dismiss persisted per shop and text in localStorage via useSyncExternalStore
 * - Automatically hidden if endsAt has passed
 */
export function AnnouncementStrip({
  announcement,
  shopSlug,
  className,
}: AnnouncementStripProps) {
  const isDismissed = useDismissedAnnouncement(shopSlug, announcement?.text);
  const isExpired = useIsAnnouncementExpired(announcement?.endsAt);

  if (isDismissed || isExpired || !announcement?.text) {
    return null;
  }

  const handleDismiss = () => {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${shopSlug}`, announcement.text);
      window.dispatchEvent(new Event('storage'));
    } catch {
      // Ignore
    }
  };

  const tone = announcement.tone;
  const variant = tone === 'warning' ? 'warning' : tone === 'promo' ? 'default' : 'info';

  const icon =
    tone === 'warning' ? (
      <IconAlertTriangle className="size-4 shrink-0 text-warning" />
    ) : tone === 'promo' ? (
      <IconFlame className="size-4 shrink-0 text-shop-10" />
    ) : (
      <IconInfoCircle className="size-4 shrink-0 text-info" />
    );

  return (
    <div className={cn('w-full', className)}>
      <Banner
        variant={variant}
        className={cn(
          'rounded-xl py-2 px-3 text-sm shadow-xs border',
          tone === 'promo' && 'border-shop-10/30 bg-shop-10/10 text-foreground',
          tone === 'info' && 'border-info/30 bg-info/10 text-foreground',
          tone === 'warning' && 'border-warning/30 bg-warning/10 text-foreground',
        )}
      >
        <BannerIcon>{icon}</BannerIcon>
        <BannerContent className="flex-1">
          <BannerTitle className="text-xs sm:text-sm font-medium leading-normal">
            {announcement.text}
          </BannerTitle>
        </BannerContent>
        <BannerClose onClick={handleDismiss} className="size-6 text-muted-foreground hover:text-foreground" />
      </Banner>
    </div>
  );
}
