import { useState } from 'react';

import { toast } from '@smartapp/ui/components/sonner';

/** Saves a file the app made (a CSV) under `name`. */
export function saveFile(file: Blob, name: string): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

/** A "Download CSV" button's state: makes the file, saves it, and says so when it fails. */
export function useDownload(failed: string) {
  const [pending, setPending] = useState(false);
  const run = (make: () => Promise<Blob>, name: string) => {
    setPending(true);
    make()
      .then((file) => {
        saveFile(file, name);
      })
      .catch(() => {
        toast.error(failed);
      })
      .finally(() => {
        setPending(false);
      });
  };
  return { pending, run };
}
