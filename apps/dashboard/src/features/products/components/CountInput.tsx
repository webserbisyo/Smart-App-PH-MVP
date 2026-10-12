import type { ComponentProps } from 'react';

import { Input } from '@smartapp/ui/components/input';

import { parseCount } from '../form';

/** A whole number field (stock, low-stock number, most choices): the number keypad on phones, `null` while empty. */
export function CountInput({
  value,
  onChange,
  ...props
}: Omit<ComponentProps<typeof Input>, 'value' | 'onChange' | 'type'> & { value: number | null; onChange: (value: number | null) => void }) {
  return (
    <Input
      inputMode="numeric"
      autoComplete="off"
      className="tabular"
      {...props}
      value={value === null ? '' : String(value)}
      onChange={(event) => {
        onChange(parseCount(event.target.value, value));
      }}
    />
  );
}
