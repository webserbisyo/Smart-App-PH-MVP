'use client';

import { useState } from 'react';
import { IconPlayerPlayFilled } from '@tabler/icons-react';

import { WORDS } from '@smartapp/core';
import { cn } from '#lib/utils';

export interface VideoSlideProps {
  youtubeId: string;
  title?: string | null | undefined;
  isActive?: boolean | undefined;
  className?: string | undefined;
}

/**
 * YouTube facade slide for BannerCarousel:
 * - Loads thumbnail from i.ytimg.com (lightweight)
 * - Only mounts youtube-nocookie.com iframe after user interaction (tap)
 * - Automatically unloads the iframe when the slide leaves (isActive becomes false)
 * - 21:9 aspect ratio matching banners
 */
export function VideoSlide({
  youtubeId,
  title,
  isActive = true,
  className,
}: VideoSlideProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [prevActive, setPrevActive] = useState(isActive);

  // Reset playing state when slide becomes inactive (React state adjustment during render)
  if (prevActive !== isActive) {
    setPrevActive(isActive);
    if (!isActive && isPlaying) {
      setIsPlaying(false);
    }
  }

  const thumbUrl = `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
  const embedUrl = `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`;

  return (
    <div
      className={cn(
        'relative aspect-[21/9] w-full overflow-hidden rounded-[var(--radius-card,1.25rem)] bg-black shadow-xs select-none',
        className,
      )}
    >
      {isPlaying && isActive ? (
        <iframe
          src={embedUrl}
          title={title ?? 'YouTube video player'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="size-full border-0"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setIsPlaying(true);
          }}
          className="group relative size-full cursor-pointer focus:outline-hidden"
          aria-label={title ? `${WORDS.shared.playVideo}: ${title}` : WORDS.shared.playVideo}
        >
          <img
            src={thumbUrl}
            alt={title ?? 'Video thumbnail'}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/25 transition-colors group-hover:bg-black/35" />

          {/* Centered YouTube-style play button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex size-14 sm:size-16 items-center justify-center rounded-2xl bg-black/70 text-white shadow-lg backdrop-blur-xs transition-transform duration-200 group-hover:scale-110 group-active:scale-95 group-hover:bg-red-600">
              <IconPlayerPlayFilled className="size-6 sm:size-7 translate-x-0.5" />
            </div>
          </div>

          {title && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-8 text-left">
              <p className="line-clamp-1 font-semibold text-sm sm:text-base text-white drop-shadow-sm">
                {title}
              </p>
            </div>
          )}
        </button>
      )}
    </div>
  );
}
