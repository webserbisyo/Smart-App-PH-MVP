import type { ComponentProps } from 'react';

import { formatPeso } from '@smartapp/core';
import type { FormatPesoOptions } from '@smartapp/core';

import { cn } from '#lib/utils';

export interface MoneyProps extends Omit<ComponentProps<'span'>, 'children'> {
  /** Centavos. */
  amount: number;
  cents?: FormatPesoOptions['cents'];
}

/** A peso amount: `₱120`, `₱1,234.50`. Tabular digits so columns of prices line up. */
export function Money({ amount, cents, className, ...props }: MoneyProps) {
  return (
    <span className={cn('tabular whitespace-nowrap', className)} {...props}>
      {formatPeso(amount, cents === undefined ? {} : { cents })}
    </span>
  );
}
