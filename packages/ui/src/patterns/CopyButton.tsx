import { useEffect, useState } from 'react';

import { IconCheck, IconCopy } from '@tabler/icons-react';

import { Button } from '#components/button';
import { toast } from '#components/sonner';

export interface CopyButtonProps {
  /** The text that goes to the clipboard. */
  value: string;
  words: { copy: string; copied: string };
  /** Shown next to the icon; icon-only when left out (the copy word is then the accessible name). */
  label?: string;
  variant?: 'outline' | 'ghost' | 'secondary';
  size?: 'sm' | 'default';
  className?: string;
}

/** Copies a value (account number, order details, shop link), says "Copied" and shows a check for a moment. */
export function CopyButton({ value, words, label, variant = 'outline', size = 'sm', className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => {
      setCopied(false);
    }, 1500);
    return () => {
      window.clearTimeout(timer);
    };
  }, [copied]);

  const copy = () => {
    navigator.clipboard.writeText(value).then(
      () => {
        setCopied(true);
        toast.success(words.copied);
      },
      () => {
        // Clipboard blocked (old browser or not allowed): nothing to undo, the value stays visible.
      },
    );
  };

  const Icon = copied ? IconCheck : IconCopy;
  return (
    <Button
      type="button"
      variant={variant}
      size={label ? size : size === 'sm' ? 'icon-sm' : 'icon'}
      onClick={copy}
      aria-label={label ? undefined : words.copy}
      className={className}
    >
      <Icon aria-hidden="true" />
      {label}
    </Button>
  );
}
