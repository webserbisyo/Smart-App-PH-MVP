import { useEffect, useId, useRef, useState } from 'react';

import { IconPhotoPlus, IconRefresh, IconTrash } from '@tabler/icons-react';

import { Button } from '#components/button';
import { Progress } from '#components/progress';
import { compressImage, isImageFile } from '#lib/compress-image';
import type { CompressOptions } from '#lib/compress-image';
import { cn } from '#lib/utils';

export interface PhotoFieldWords {
  add: string;
  change: string;
  remove: string;
  uploading: string;
  compressing: string;
  failed: string;
  retry: string;
  notImage: string;
}

export interface PhotoFieldProps {
  label: string;
  /** The saved photo's URL, or `null`. */
  value: string | null;
  /**
   * Stores the compressed photo and resolves with what to keep (a storage path). `progress` (0 to 100) is optional;
   * without it the bar shows "working".
   */
  upload: (blob: Blob, progress: (percent: number) => void) => Promise<string>;
  /** The stored path, or `null` after Remove. */
  onChange: (path: string | null) => void;
  /** Size rules: `IMAGE_SIZES.photo`, `.logo`, `.qr` or `.proof`. */
  compress: CompressOptions;
  words: PhotoFieldWords;
  shape?: 'square' | 'wide';
  disabled?: boolean;
  className?: string;
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'compressing' }
  | { kind: 'uploading'; blob: Blob; preview: string; percent: number | null }
  | { kind: 'failed'; blob: Blob; preview: string }
  | { kind: 'wrong-type' };

/**
 * One photo: pick (camera or gallery) → made smaller on the phone → uploaded with progress → shown, with Retry
 * when the upload fails and Remove. Copied and trimmed from the first build's upload queue (one file only).
 */
export function PhotoField({ label, value, upload, onChange, compress, words, shape = 'square', disabled = false, className }: PhotoFieldProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const preview = phase.kind === 'uploading' || phase.kind === 'failed' ? phase.preview : null;

  // The local preview is a blob URL: free it once it is no longer shown.
  useEffect(() => {
    if (!preview) return;
    return () => {
      URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const send = (blob: Blob, previewUrl: string) => {
    setPhase({ kind: 'uploading', blob, preview: previewUrl, percent: null });
    upload(blob, (percent) => {
      setPhase((current) => (current.kind === 'uploading' && current.blob === blob ? { ...current, percent } : current));
    }).then(
      (path) => {
        onChange(path);
        setPhase({ kind: 'idle' });
      },
      () => {
        setPhase({ kind: 'failed', blob, preview: URL.createObjectURL(blob) });
      },
    );
  };

  const pick = (file: File | undefined) => {
    if (!file) return;
    if (!isImageFile(file)) {
      setPhase({ kind: 'wrong-type' });
      return;
    }
    setPhase({ kind: 'compressing' });
    compressImage(file, compress).then(
      (blob) => {
        send(blob, URL.createObjectURL(blob));
      },
      () => {
        setPhase({ kind: 'wrong-type' });
      },
    );
  };

  const busy = phase.kind === 'compressing' || phase.kind === 'uploading';
  const shown = preview ?? value;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <span className="text-sm font-medium">{label}</span>
      <div
        className={cn(
          'relative flex items-center justify-center overflow-hidden rounded-xl border border-dashed bg-muted/40',
          shape === 'square' ? 'aspect-square w-32' : 'aspect-video w-full max-w-sm',
        )}
      >
        {shown ? (
          <img src={shown} alt="" className={cn('size-full object-cover', busy && 'opacity-60')} />
        ) : (
          <IconPhotoPlus aria-hidden="true" className="size-8 text-muted-foreground" />
        )}
        {busy && (
          <div className="absolute inset-x-2 bottom-2 flex flex-col gap-1 rounded-md bg-background/90 p-1.5 text-xs" role="status">
            <span>{phase.kind === 'compressing' ? words.compressing : words.uploading}</span>
            <Progress value={phase.kind === 'uploading' ? phase.percent : null} aria-label={words.uploading} />
          </div>
        )}
      </div>

      {phase.kind === 'failed' && (
        <p role="alert" className="text-sm text-destructive-text">
          {words.failed}
        </p>
      )}
      {phase.kind === 'wrong-type' && (
        <p role="alert" className="text-sm text-destructive-text">
          {words.notImage}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          className="sr-only"
          tabIndex={-1}
          disabled={disabled || busy}
          onChange={(event) => {
            pick(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
        {phase.kind === 'failed' ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              send(phase.blob, URL.createObjectURL(phase.blob));
            }}
          >
            <IconRefresh aria-hidden="true" />
            {words.retry}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || busy}
            onClick={() => {
              inputRef.current?.click();
            }}
          >
            <IconPhotoPlus aria-hidden="true" />
            {shown ? words.change : words.add}
          </Button>
        )}
        {(value !== null || phase.kind === 'failed') && !busy && (
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => {
              setPhase({ kind: 'idle' });
              onChange(null);
            }}
          >
            <IconTrash aria-hidden="true" />
            {words.remove}
          </Button>
        )}
      </div>
    </div>
  );
}
