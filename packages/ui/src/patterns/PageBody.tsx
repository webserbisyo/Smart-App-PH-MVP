import type { ReactNode } from 'react';

import { cn } from '#lib/utils';

const WIDTHS = {
  full: 'max-w-400',
  wide: 'max-w-320',
  settings: 'max-w-220',
  form: 'max-w-180',
  narrow: 'max-w-120',
} as const;

/** A page's content width (docs/ui-kit.md section 5): full 1600, wide 1280, settings 880, form 720, narrow 480. */
export function PageBody({ size = 'wide', className, children }: { size?: keyof typeof WIDTHS; className?: string; children: ReactNode }) {
  return <div className={cn('mx-auto flex w-full flex-col gap-6', WIDTHS[size], className)}>{children}</div>;
}
