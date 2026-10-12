import { IconCategory } from '@tabler/icons-react';

import type { CategoryIcon as CategoryIconValue } from '@smartapp/core';

import { FLUENT_ICONS, isFluentKey } from '#assets/fluent';
import { cn } from '#lib/utils';

export interface CategoryIconProps {
  icon: CategoryIconValue | null;
  /** Turns a `shop-media` path into a URL (`mediaUrl` from @smartapp/api); needed for photo icons. */
  imageUrl?: (path: string) => string;
  /** Accessible name; leave empty when the category name is shown next to it. */
  label?: string;
  className?: string;
}

/** A category's icon: Fluent 3D, an emoji, or a photo; a plain icon when none is set or the key is unknown. */
export function CategoryIcon({ icon, imageUrl, label = '', className }: CategoryIconProps) {
  const box = cn('inline-flex size-8 shrink-0 items-center justify-center', className);
  const decorative = label === '';

  if (icon?.kind === 'fluent' && isFluentKey(icon.key)) {
    return (
      <img
        src={FLUENT_ICONS[icon.key].url}
        alt={label}
        aria-hidden={decorative || undefined}
        width={128}
        height={128}
        loading="lazy"
        decoding="async"
        draggable={false}
        className={cn(box, 'object-contain')}
      />
    );
  }
  if (icon?.kind === 'emoji') {
    return (
      <span role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : label} aria-hidden={decorative || undefined} className={cn(box, 'text-[length:calc(var(--spacing)*6)] leading-none')}>
        {icon.value}
      </span>
    );
  }
  if (icon?.kind === 'image' && imageUrl) {
    return (
      <img
        src={imageUrl(icon.path)}
        alt={label}
        aria-hidden={decorative || undefined}
        loading="lazy"
        decoding="async"
        className={cn(box, 'rounded-md object-cover')}
      />
    );
  }
  return (
    <span aria-hidden="true" className={cn(box, 'text-muted-foreground')}>
      <IconCategory className="size-3/4" />
    </span>
  );
}
