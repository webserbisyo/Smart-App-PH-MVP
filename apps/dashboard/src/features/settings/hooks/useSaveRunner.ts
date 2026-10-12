import { useState } from 'react';

import { ApiError } from '@smartapp/api';
import { WORDS } from '@smartapp/core';
import type { ApiErrorCode } from '@smartapp/core';
import { toast } from '@smartapp/ui/components/sonner';

/** Runs a page's save steps in order: shows Saving, a "Saved" toast, or the error code of the step that failed. */
export function useSaveRunner() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiErrorCode | null>(null);
  const run = async (work: () => Promise<void>) => {
    setSaving(true);
    setError(null);
    try {
      await work();
      toast.success(WORDS.dashboard.settings.saved);
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.code : 'unknown');
    } finally {
      setSaving(false);
    }
  };
  return { saving, error, run };
}
