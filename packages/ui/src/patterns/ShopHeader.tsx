import type { ReactNode } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '#components/avatar';
import { Status, StatusIndicator, StatusLabel } from '#components/status';
import { cn } from '#lib/utils';

export interface ShopHeaderProps {
  name: string;
  logoUrl: string | null;
  tagline?: string | null;
  /** From `openState`: open or closed, worded ("Open until 9 PM", "Closed · opens 7 AM"). */
  status: { open: boolean; text: string };
  /** Right side (a share or Messenger button). */
  actions?: ReactNode;
  className?: string;
}

/** The storefront's shop header: logo, name, open or closed, tagline. Uses the shop's 30% colour. */
export function ShopHeader({ name, logoUrl, tagline, status, actions, className }: ShopHeaderProps) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
  return (
    <header className={cn('flex items-center gap-3', className)}>
      <Avatar className="size-14 shrink-0 rounded-xl">
        {logoUrl && <AvatarImage src={logoUrl} alt="" className="rounded-xl object-cover" />}
        <AvatarFallback className="rounded-xl text-lg font-bold">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h1 className="truncate text-xl leading-tight font-bold">{name}</h1>
        <Status variant={status.open ? 'success' : 'neutral'} className="py-0.5">
          <StatusIndicator pulse={status.open} />
          <StatusLabel>{status.text}</StatusLabel>
        </Status>
        {tagline && <p className="line-clamp-2 text-sm opacity-80">{tagline}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
