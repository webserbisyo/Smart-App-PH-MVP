import { IconMinus, IconPlus } from '@tabler/icons-react';

import { Button } from '#components/button';
import { ButtonGroup, ButtonGroupText } from '#components/button-group';
import { cn } from '#lib/utils';

export interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  words: { decrease: string; increase: string; quantity: string };
  size?: 'default' | 'sm';
  className?: string;
}

/** − 2 + for the item sheet and the cart. Never goes below `min` (1) or above `max` (99). */
export function QuantityStepper({ value, onChange, min = 1, max = 99, words, size = 'default', className }: QuantityStepperProps) {
  const buttonSize = size === 'sm' ? 'icon-sm' : 'icon';
  return (
    <ButtonGroup aria-label={words.quantity} className={cn('shrink-0', className)}>
      <Button
        variant="outline"
        size={buttonSize}
        aria-label={words.decrease}
        disabled={value <= min}
        onClick={() => {
          onChange(Math.max(min, value - 1));
        }}
      >
        <IconMinus aria-hidden="true" />
      </Button>
      <ButtonGroupText
        aria-live="polite"
        className={cn('tabular justify-center bg-background font-semibold', size === 'sm' ? 'min-w-9' : 'min-w-11')}
      >
        {value}
      </ButtonGroupText>
      <Button
        variant="outline"
        size={buttonSize}
        aria-label={words.increase}
        disabled={value >= max}
        onClick={() => {
          onChange(Math.min(max, value + 1));
        }}
      >
        <IconPlus aria-hidden="true" />
      </Button>
    </ButtonGroup>
  );
}
