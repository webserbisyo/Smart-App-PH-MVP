import { useState } from 'react';

import type { Category } from '@smartapp/core';

/** Open and close state for `CategoryDialog`; each opening gets a fresh form. */
export function useCategoryDialog() {
  const [state, setState] = useState<{ open: boolean; category: Category | null; formKey: number }>({ open: false, category: null, formKey: 0 });
  return {
    openFor: (category: Category | null) => {
      setState((current) => ({ open: true, category, formKey: current.formKey + 1 }));
    },
    props: {
      open: state.open,
      category: state.category,
      formKey: state.formKey,
      onOpenChange: (open: boolean) => {
        setState((current) => ({ ...current, open }));
      },
    },
  };
}
