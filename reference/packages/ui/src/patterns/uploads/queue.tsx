'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useFileUpload } from '#hooks/use-file-upload';
import { compressImage, PHOTO_MAX_EDGE_PX } from '#lib/crop-image';

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
/** Photos up to 10 MB are picked; they are shrunk to WebP before they leave the phone. */
export const MAX_PICK_BYTES = 10 * 1024 * 1024;

export interface UploadLabels {
  /** "Choose a photo". */
  choose: string;
  /** "or drop it here". */
  drop: string;
  /** "Uploading…". */
  uploading: string;
  /** "Didn't upload". */
  failed: string;
  retry: string;
  remove: string;
  wrongType: string;
  /** "Photos up to 10 MB". */
  tooBig: string;
  /** "You can add up to 8". */
  tooMany: string;
  /** "You're offline. It will need a connection." */
  offline: string;
}

/** The file as it is sent: a compressed image (`webp` / `jpg`) or the file itself. */
export interface UploadFile {
  blob: Blob;
  /** `webp` / `jpg` for a shrunk image, else the picked file's own extension. */
  ext: string;
  name: string;
}

/**
 * Sends one file to storage (through `packages/data`) and resolves with what to keep: its path or public URL.
 * `progress` (0–100) is optional; without it the bar runs as "working".
 */
export type UploadFn = (file: UploadFile, progress: (percent: number) => void) => Promise<string>;

export type UploadStatus = 'uploading' | 'done' | 'failed';

export interface UploadItem {
  id: string;
  name: string;
  size: number;
  /** A local preview while it uploads. */
  preview: string | null;
  status: UploadStatus;
  percent: number | null;
  /** What `onUpload` resolved with. */
  value: string | null;
  error: string | null;
}

export interface UploadQueueOptions {
  accept?: readonly string[];
  maxBytes?: number;
  multiple?: boolean;
  /** How many more files fit (photos already saved count against the limit). */
  room?: number;
  /** Shrink images to this longest edge (WebP). `false`: send as picked. */
  compress?: number | false;
  onUpload: UploadFn;
  /** Each file once it is stored. */
  onUploaded: (value: string, item: UploadItem) => void;
  labels: UploadLabels;
  disabled?: boolean;
}

function extOf(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? 'bin';
}

/** Pick / drop / paste → check → shrink → upload, one row per file, with Retry. Files are kept until they're stored. */
export function useUploadQueue({ accept = IMAGE_TYPES, maxBytes = MAX_PICK_BYTES, multiple = false, room = Number.POSITIVE_INFINITY, compress = PHOTO_MAX_EDGE_PX, onUpload, onUploaded, labels, disabled = false }: UploadQueueOptions) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const files = useRef(new Map<string, File>());
  const latest = useRef({ onUpload, onUploaded });
  useEffect(() => {
    latest.current = { onUpload, onUploaded };
  });

  const patch = useCallback((id: string, next: Partial<UploadItem>) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...next } : item)));
  }, []);

  const send = useCallback(
    async (id: string) => {
      const file = files.current.get(id);
      if (!file) return;
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        patch(id, { status: 'failed', error: labels.offline, percent: null });
        return;
      }
      patch(id, { status: 'uploading', error: null, percent: null });
      try {
        let upload: UploadFile = { blob: file, ext: extOf(file.name), name: file.name };
        if (compress !== false && file.type.startsWith('image/')) {
          const src = URL.createObjectURL(file);
          try {
            const image = await compressImage(src, null, compress);
            upload = { blob: image.blob, ext: image.ext, name: file.name };
          } finally {
            URL.revokeObjectURL(src);
          }
        }
        const value = await latest.current.onUpload(upload, (percent) => patch(id, { percent: Math.max(0, Math.min(100, Math.round(percent))) }));
        let done: UploadItem | null = null;
        setItems((current) =>
          current.map((item) => {
            if (item.id !== id) return item;
            done = { ...item, status: 'done', value, percent: 100 };
            return done;
          }),
        );
        files.current.delete(id);
        latest.current.onUploaded(value, done ?? { id, name: file.name, size: file.size, preview: null, status: 'done', percent: 100, value, error: null });
      } catch {
        patch(id, { status: 'failed', error: labels.failed, percent: null });
      }
    },
    [compress, labels.failed, labels.offline, patch],
  );

  const take = useCallback(
    (picked: readonly File[]) => {
      setProblem(null);
      const list = multiple ? picked : picked.slice(0, 1);
      if (list.length > room) {
        setProblem(labels.tooMany);
        return;
      }
      for (const file of list) {
        if (!accept.includes(file.type)) {
          setProblem(labels.wrongType);
          continue;
        }
        if (file.size > maxBytes) {
          setProblem(labels.tooBig);
          continue;
        }
        const id = `${file.name}-${String(Date.now())}-${Math.random().toString(36).slice(2, 8)}`;
        files.current.set(id, file);
        const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
        const item: UploadItem = { id, name: file.name, size: file.size, preview, status: 'uploading', percent: null, value: null, error: null };
        setItems((current) => (multiple ? [...current, item] : [item]));
        void send(id);
      }
    },
    [accept, labels.tooBig, labels.tooMany, labels.wrongType, maxBytes, multiple, room, send],
  );

  const [state, actions] = useFileUpload({
    multiple,
    onFilesAdded: (added) => {
      take(added.flatMap((entry) => (entry.file instanceof File ? [entry.file] : [])));
      actions.clearFiles();
    },
  });

  // Paste a screenshot or photo anywhere on the page.
  useEffect(() => {
    if (disabled) return undefined;
    const onPaste = (event: ClipboardEvent) => {
      const pasted = Array.from(event.clipboardData?.files ?? []);
      if (pasted.length === 0) return;
      event.preventDefault();
      take(pasted);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [disabled, take]);

  const remove = useCallback((id: string) => {
    files.current.delete(id);
    setItems((current) => {
      const gone = current.find((item) => item.id === id);
      if (gone?.preview) URL.revokeObjectURL(gone.preview);
      return current.filter((item) => item.id !== id);
    });
  }, []);

  /** Uploaded items leave the queue once the parent shows the stored value. */
  const settle = useCallback(() => {
    setItems((current) => {
      for (const item of current) if (item.status === 'done' && item.preview) URL.revokeObjectURL(item.preview);
      return current.filter((item) => item.status !== 'done');
    });
  }, []);

  return {
    items,
    problem,
    isDragging: state.isDragging,
    retry: (id: string) => void send(id),
    remove,
    settle,
    open: actions.openFileDialog,
    inputProps: actions.getInputProps({ accept: accept.join(','), multiple, disabled, className: 'sr-only', tabIndex: -1 }),
    dropProps: {
      onDragEnter: actions.handleDragEnter,
      onDragLeave: actions.handleDragLeave,
      onDragOver: actions.handleDragOver,
      onDrop: actions.handleDrop,
    },
  };
}

export type UploadQueue = ReturnType<typeof useUploadQueue>;
