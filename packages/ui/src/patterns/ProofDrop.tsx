'use client';

import { useEffect, useId, useRef, useState } from 'react';

import { Button } from '#components/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '#components/field';
import { Input } from '#components/input';
import { Progress } from '#components/progress';
import { Spinner } from '#components/spinner';
import { IconCamera, IconPhoto, IconRefresh, IconTrash, IconUpload } from '../icons';
import { compressImage, IMAGE_SIZES, isImageFile } from '#lib/compress-image';
import { cn } from '#lib/utils';

export interface ProofDropWords {
  title?: string;
  dropHint?: string;
  browseHint?: string;
  referenceLabel?: string;
  referencePlaceholder?: string;
  referenceHint?: string;
  referenceInvalid?: string;
  photoNeeded?: string;
  send?: string;
  sending?: string;
  uploading?: string;
  compressing?: string;
  failed?: string;
  retry?: string;
  remove?: string;
  notImage?: string;
}

export interface ProofDropProps {
  upload: (blob: Blob, onProgress: (percent: number) => void) => Promise<string>;
  onSubmit: (proofPath: string, referenceNo: string) => void;
  submitting?: boolean;
  disabled?: boolean;
  words?: ProofDropWords;
  className?: string;
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'compressing' }
  | { kind: 'uploading'; blob: Blob; preview: string; percent: number | null }
  | { kind: 'ready'; path: string; blob: Blob; preview: string }
  | { kind: 'failed'; blob: Blob; preview: string }
  | { kind: 'wrong-type' };

function referenceOk(ref: string): boolean {
  const len = ref.trim().length;
  return len >= 4 && len <= 40;
}

export function ProofDrop({
  upload,
  onSubmit,
  submitting = false,
  disabled = false,
  words,
  className,
}: ProofDropProps) {
  const inputId = useId();
  const cameraInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [reference, setReference] = useState('');
  const [tried, setTried] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const preview =
    phase.kind === 'uploading' || phase.kind === 'ready' || phase.kind === 'failed'
      ? phase.preview
      : null;

  // Cleanup blob URL when component unmounts or preview changes
  useEffect(() => {
    if (!preview) return;
    return () => {
      URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleUpload = (blob: Blob, previewUrl: string) => {
    setPhase({ kind: 'uploading', blob, preview: previewUrl, percent: null });
    upload(blob, (percent) => {
      setPhase((current) =>
        current.kind === 'uploading' && current.blob === blob ? { ...current, percent } : current,
      );
    }).then(
      (path) => {
        setPhase({ kind: 'ready', path, blob, preview: previewUrl });
      },
      () => {
        setPhase({ kind: 'failed', blob, preview: previewUrl });
      },
    );
  };

  const processFile = (file: File | undefined) => {
    if (!file) return;
    if (!isImageFile(file)) {
      setPhase({ kind: 'wrong-type' });
      return;
    }
    setPhase({ kind: 'compressing' });
    compressImage(file, IMAGE_SIZES.proof).then(
      (blob) => {
        handleUpload(blob, URL.createObjectURL(blob));
      },
      () => {
        setPhase({ kind: 'wrong-type' });
      },
    );
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled || submitting) return;
    const file = e.dataTransfer.files[0];
    processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !submitting) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleRetry = () => {
    if (phase.kind === 'failed') {
      handleUpload(phase.blob, phase.preview);
    }
  };

  const handleRemove = () => {
    setPhase({ kind: 'idle' });
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setTried(true);
    if (phase.kind !== 'ready' || !referenceOk(reference) || submitting) return;
    onSubmit(phase.path, reference.trim());
  };

  const isInvalidRef = tried && !referenceOk(reference);
  const isMissingPhoto = tried && phase.kind !== 'ready';
  const isBusy = phase.kind === 'compressing' || phase.kind === 'uploading';

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'flex flex-col gap-4 rounded-[var(--radius-card,1.25rem)] border border-warning/50 bg-warning-soft p-5 text-foreground shadow-xs',
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-bold text-foreground">
          {words?.title ?? 'Submit Payment Proof'}
        </h3>
        <p className="text-xs text-muted-foreground">
          {words?.dropHint ?? 'Take a photo or upload a screenshot of your payment receipt.'}
        </p>
      </div>

      {/* Hidden file inputs: one for gallery/file, one for camera capture on mobile */}
      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={disabled || isBusy || submitting}
        onChange={(e) => {
          processFile(e.target.files?.[0]);
        }}
      />
      <input
        ref={cameraInputRef}
        id={cameraInputId}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        disabled={disabled || isBusy || submitting}
        onChange={(e) => {
          processFile(e.target.files?.[0]);
        }}
      />

      {/* Drop / Preview Area */}
      {preview ? (
        <div className="relative flex flex-col items-center gap-3 rounded-xl border border-border/80 bg-background/80 p-4 shadow-2xs">
          <img
            src={preview}
            alt="Payment proof preview"
            className="max-h-56 w-auto rounded-lg object-contain border border-border shadow-2xs"
          />

          {isBusy && (
            <div className="flex w-full flex-col items-center gap-2 max-w-xs">
              <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
                <span>
                  {phase.kind === 'compressing'
                    ? (words?.compressing ?? 'Optimizing photo...')
                    : (words?.uploading ?? 'Uploading proof...')}
                </span>
                {phase.kind === 'uploading' && phase.percent !== null && (
                  <span className="tabular">{phase.percent}%</span>
                )}
              </div>
              <Progress value={phase.kind === 'uploading' ? (phase.percent ?? 50) : 30} className="h-1.5 w-full" />
            </div>
          )}

          {phase.kind === 'failed' && (
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-destructive-text">
                {words?.failed ?? 'Upload failed'}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="gap-1 text-xs h-7"
              >
                <IconRefresh className="size-3.5" aria-hidden="true" />
                {words?.retry ?? 'Retry'}
              </Button>
            </div>
          )}

          {!isBusy && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive h-7 gap-1"
            >
              <IconTrash className="size-3.5" aria-hidden="true" />
              {words?.remove ?? 'Change photo'}
            </Button>
          )}
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-colors',
            isDragOver ? 'border-primary bg-primary/10' : 'border-border/80 bg-background/50 hover:bg-background/80',
            isMissingPhoto && 'border-destructive/80 bg-destructive/5',
          )}
        >
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <IconUpload className="size-6" aria-hidden="true" />
          </div>

          <div className="flex flex-col gap-1 max-w-xs">
            <p className="text-sm font-semibold text-foreground">
              {words?.dropHint ?? 'Drag and drop your screenshot here'}
            </p>
            <p className="text-xs text-muted-foreground">
              {words?.browseHint ?? 'or choose an option below'}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || submitting}
              onClick={() => {
                fileInputRef.current?.click();
              }}
              className="gap-1.5 text-xs"
            >
              <IconPhoto className="size-4" aria-hidden="true" />
              <span>Choose photo</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || submitting}
              onClick={() => {
                cameraInputRef.current?.click();
              }}
              className="gap-1.5 text-xs"
            >
              <IconCamera className="size-4" aria-hidden="true" />
              <span>Camera</span>
            </Button>
          </div>

          {phase.kind === 'wrong-type' && (
            <p className="text-xs text-destructive-text">
              {words?.notImage ?? 'Please choose a valid image file.'}
            </p>
          )}
          {isMissingPhoto && (
            <p className="text-xs text-destructive-text">
              {words?.photoNeeded ?? 'Add a screenshot of your payment.'}
            </p>
          )}
        </div>
      )}

      {/* Reference Number */}
      <Field data-invalid={isInvalidRef || undefined}>
        <FieldLabel htmlFor="proof-reference">
          {words?.referenceLabel ?? 'Reference number'}
        </FieldLabel>
        <Input
          id="proof-reference"
          autoComplete="off"
          maxLength={40}
          value={reference}
          placeholder={words?.referencePlaceholder ?? 'e.g. 100234567890'}
          aria-invalid={isInvalidRef}
          onChange={(e) => {
            setReference(e.target.value);
          }}
          disabled={disabled || submitting}
        />
        {isInvalidRef ? (
          <FieldError>
            {words?.referenceInvalid ?? 'Must be between 4 and 40 characters.'}
          </FieldError>
        ) : (
          <FieldDescription>
            {words?.referenceHint ?? 'Type the transaction reference number from your GCash, Maya or bank receipt.'}
          </FieldDescription>
        )}
      </Field>

      <Button
        type="submit"
        variant="shop"
        size="lg"
        disabled={disabled || isBusy || phase.kind !== 'ready' || !referenceOk(reference) || submitting}
        className="w-full font-bold"
      >
        {submitting ? (
          <>
            <Spinner className="mr-1.5 size-4" />
            {words?.sending ?? 'Submitting proof...'}
          </>
        ) : (
          words?.send ?? 'Submit payment proof'
        )}
      </Button>
    </form>
  );
}
