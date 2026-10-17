'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import Autoplay from 'embla-carousel-autoplay';

import type { ShopBanner } from '@smartapp/core';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '#components/carousel';
import { cn } from '#lib/utils';
import { BrandCard } from './BrandCard';
import { VideoSlide } from './VideoSlide';

export interface BannerCarouselProps {
  banners?: readonly ShopBanner[] | undefined;
  shopName: string;
  tagline?: string | null | undefined;
  logoUrl?: string | null | undefined;
  className?: string | undefined;
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (callback) => {
      if (typeof window === 'undefined') return () => {};
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      mq.addEventListener('change', callback);
      return () => {
        mq.removeEventListener('change', callback);
      };
    },
    () => (typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false),
    () => false,
  );
}

/**
 * BannerCarousel pattern:
 * - Falls back to BrandCard if 0 banners configured.
 * - Single banner: static display, no dots, no autoplay.
 * - Multiple banners: Embla carousel with 5s autoplay.
 * - Autoplay pauses on touch, when document is hidden, and is disabled for prefers-reduced-motion.
 * - Unloads VideoSlide iframes when slides change.
 * - 21:9 responsive ratio with rounded card corners.
 */
export function BannerCarousel({
  banners = [],
  shopName,
  tagline,
  logoUrl,
  className,
}: BannerCarouselProps) {
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Check prefers-reduced-motion without setState in effect
  const prefersReducedMotion = usePrefersReducedMotion();

  // Update current slide index from Embla API
  useEffect(() => {
    if (!api) return;
    const onSelect = () => {
      setCurrentIndex(api.selectedScrollSnap());
    };
    api.on('select', onSelect);
    api.on('reInit', onSelect);
    return () => {
      api.off('select', onSelect);
    };
  }, [api]);

  // Autoplay plugin configuration: 5s delay, pause on hover/interaction, pause when hidden
  const plugins = useMemo(() => {
    if (banners.length <= 1 || prefersReducedMotion) return [];
    return [
      Autoplay({
        delay: 5000,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
      }),
    ];
  }, [banners.length, prefersReducedMotion]);

  if (banners.length === 0) {
    return (
      <BrandCard
        name={shopName}
        tagline={tagline}
        logoUrl={logoUrl}
        className={className}
      />
    );
  }

  // Single banner: no carousel overhead
  if (banners.length === 1) {
    const banner = banners[0];
    if (!banner) return null;
    return (
      <div className={cn('relative w-full', className)}>
        <SingleBannerSlide banner={banner} isActive={true} isFirst={true} />
      </div>
    );
  }

  return (
    <div className={cn('relative w-full flex flex-col gap-2', className)}>
      <Carousel
        setApi={setApi}
        plugins={plugins}
        opts={{
          loop: true,
          align: 'start',
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-0">
          {banners.map((banner, index) => (
            <CarouselItem key={banner.id} className="pl-0 basis-full">
              <SingleBannerSlide
                banner={banner}
                isActive={currentIndex === index}
                isFirst={index === 0}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Dots navigation */}
      <div className="flex items-center justify-center gap-1.5 py-1">
        {banners.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => {
              api?.scrollTo(index);
            }}
            aria-label={`Go to slide ${String(index + 1)}`}
            className={cn(
              'h-2 rounded-full transition-all duration-300 focus:outline-hidden',
              currentIndex === index
                ? 'w-6 bg-shop-10'
                : 'w-2 bg-shop-10/25 hover:bg-shop-10/50',
            )}
          />
        ))}
      </div>
    </div>
  );
}

function SingleBannerSlide({
  banner,
  isActive,
  isFirst,
}: {
  banner: ShopBanner;
  isActive: boolean;
  isFirst: boolean;
}) {
  if (banner.kind === 'youtube' && banner.youtubeId) {
    return (
      <VideoSlide
        youtubeId={banner.youtubeId}
        title={banner.title}
        isActive={isActive}
      />
    );
  }

  const content = (
    <div className="relative aspect-[21/9] w-full overflow-hidden rounded-[var(--radius-card,1.25rem)] bg-muted shadow-xs">
      {banner.imagePath ? (
        <img
          src={banner.imagePath}
          alt={banner.title}
          className="size-full object-cover"
          loading={isFirst ? 'eager' : 'lazy'}
          fetchPriority={isFirst ? 'high' : 'auto'}
        />
      ) : (
        <div className="flex size-full items-center justify-center bg-shop-10/10 text-shop-10 font-bold">
          {banner.title}
        </div>
      )}

      {banner.title && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-4 pt-8">
          <p className="line-clamp-1 font-semibold text-sm sm:text-base text-white drop-shadow-sm">
            {banner.title}
          </p>
        </div>
      )}
    </div>
  );

  if (banner.linkUrl) {
    return (
      <a
        href={banner.linkUrl}
        target={banner.linkUrl.startsWith('http') ? '_blank' : undefined}
        rel="noopener noreferrer"
        className="block focus:outline-hidden"
      >
        {content}
      </a>
    );
  }

  return content;
}
