'use client';

import { useEffect, useState } from 'react';

import { WORDS } from '@smartapp/core';
import { Alert, AlertDescription, AlertTitle } from '#components/alert';
import { Button } from '#components/button';
import { Cropper, CropperArea, CropperImage } from '#components/cropper';
import type { CropperAreaData } from '#components/cropper';
import { Progress } from '#components/progress';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '#components/responsive-dialog';
import { useFileUpload } from '#hooks/use-file-upload';
import {
  IconAlertTriangle,
  IconCheck,
  IconInfoCircle,
  IconPhoto,
  IconPhotoPlus,
  IconRefresh,
  IconTrash,
} from '../icons';
import { compressImage } from '#lib/compress-image';
import { IMAGE_SIZES } from '#lib/compress-image';
import { cropImageToBlob } from '#lib/crop-canvas';
import { cn } from '#lib/utils';

export interface BannerFieldProps {
  label?: string | undefined;
  value: string | null;
  upload: (blob: Blob, progress: (percent: number) => void) => Promise<string>;
  onChange: (path: string | null) => void;
  disabled?: boolean | undefined;
  className?: string | undefined;
}

type UploadPhase =
  | { kind: 'idle' }
  | { kind: 'compressing' }
  | { kind: 'uploading'; percent: number | null; blob: Blob; preview: string }
  | { kind: 'error'; message: string; blob: Blob; preview: string };

const BANNER_ASPECT = 21 / 9; // ~2.333

/**
 * BannerField pattern (Storefront v2 Step 10):
 * Layout based on ReUI c-file-upload-10 (cover dropzone with guidelines panel).
 * 21:9 aspect ratio, IMAGE_SIZES.banner (1600 × 686, 300 KB).
 * Flow: pick or drop -> Cropper (21:9) -> compressImage (WebP) -> Supabase Storage upload with real percent progress.
 * Change & Remove always visible on phones.
 */
export function BannerField({
  label = WORDS.dashboard.settings.look.banner,
  value,
  upload,
  onChange,
  disabled = false,
  className,
}: BannerFieldProps) {
  const [phase, setPhase] = useState<UploadPhase>({ kind: 'idle' });
  const [rawFileUrl, setRawFileUrl] = useState<string | null>(null);
  const [cropArea, setCropArea] = useState<CropperAreaData | null>(null);

  const preview = phase.kind === 'uploading' || phase.kind === 'error' ? phase.preview : null;
  const displayImage = preview ?? value;

  // Clean up object URLs
  useEffect(() => {
    if (!rawFileUrl) return;
    return () => {
      URL.revokeObjectURL(rawFileUrl);
    };
  }, [rawFileUrl]);

  const startUpload = (blob: Blob, previewUrl: string) => {
    setPhase({ kind: 'uploading', percent: null, blob, preview: previewUrl });
    upload(blob, (percent) => {
      setPhase((prev) => (prev.kind === 'uploading' ? { ...prev, percent } : prev));
    }).then(
      (path) => {
        onChange(path);
        setPhase({ kind: 'idle' });
      },
      () => {
        setPhase({
          kind: 'error',
          message: WORDS.shared.photo.failed,
          blob,
          preview: previewUrl,
        });
      },
    );
  };

  const handleApplyCrop = async () => {
    if (!rawFileUrl) return;
    try {
      setPhase({ kind: 'compressing' });
      const cropped = await cropImageToBlob(rawFileUrl, cropArea, BANNER_ASPECT);
      const compressed = await compressImage(cropped, IMAGE_SIZES.banner);
      const previewUrl = URL.createObjectURL(compressed);
      setRawFileUrl(null);
      startUpload(compressed, previewUrl);
    } catch {
      setPhase({
        kind: 'error',
        message: WORDS.shared.photo.failed,
        blob: new Blob([]),
        preview: rawFileUrl,
      });
      setRawFileUrl(null);
    }
  };

  const [{ isDragging }, { openFileDialog, getInputProps, handleDragEnter, handleDragLeave, handleDragOver, handleDrop }] =
    useFileUpload({
      accept: 'image/jpeg,image/png,image/webp,image/heic',
      maxFiles: 1,
      onFilesAdded: (added) => {
        const item = added[0]?.file;
        if (item instanceof File) {
          const url = URL.createObjectURL(item);
          setRawFileUrl(url);
          setPhase({ kind: 'idle' });
        }
      },
    });

  const busy = phase.kind === 'compressing' || phase.kind === 'uploading';
  const guidelines = WORDS.dashboard.settings.look.bannerGuidelines;

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <span className="text-sm font-medium">{label}</span>

      {/* 21:9 Cover Drop Zone (ReUI c-file-upload-10 style) */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          'group relative flex aspect-[21/9] w-full max-w-2xl items-center justify-center overflow-hidden rounded-[var(--radius-card,1.25rem)] border-2 border-dashed bg-muted/20 transition-all',
          isDragging && 'border-primary bg-primary/5 ring-4 ring-primary/10',
          displayImage ? 'border-border/60' : 'border-muted-foreground/30',
        )}
      >
        <input {...getInputProps()} className="sr-only" tabIndex={-1} disabled={disabled || busy} />

        {displayImage ? (
          <>
            <img src={displayImage} alt="" className={cn('size-full object-cover', busy && 'opacity-40')} />
            {/* Always visible on touch, hover on desktop */}
            <div className="absolute inset-x-3 bottom-3 flex items-center justify-end gap-2 rounded-xl bg-background/80 p-2 backdrop-blur-xs transition-opacity sm:opacity-90 sm:group-hover:opacity-100">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={disabled || busy}
                onClick={openFileDialog}
              >
                <IconPhotoPlus className="size-4" />
                {WORDS.shared.photo.change}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={disabled || busy}
                onClick={() => {
                  setPhase({ kind: 'idle' });
                  onChange(null);
                }}
              >
                <IconTrash className="size-4" />
                {WORDS.shared.photo.remove}
              </Button>
            </div>
          </>
        ) : (
          <div
            onClick={openFileDialog}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground transition-opacity hover:opacity-80"
          >
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <IconPhoto className="size-6" />
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-semibold text-foreground">Click to upload or drag and drop</p>
              <p className="text-xs text-muted-foreground">Wide 21:9 banner image</p>
            </div>
          </div>
        )}

        {/* Upload Progress Overlay */}
        {busy && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/85 p-4 text-center">
            <span className="text-sm font-semibold">
              {phase.kind === 'compressing' ? WORDS.shared.photo.compressing : WORDS.shared.photo.uploading}
            </span>
            <Progress value={phase.kind === 'uploading' ? phase.percent : null} className="mt-2 h-2 w-48 max-w-full" />
          </div>
        )}
      </div>

      {/* Error Alert with Retry */}
      {phase.kind === 'error' && (
        <Alert variant="destructive" className="max-w-2xl">
          <IconAlertTriangle className="size-4" />
          <AlertTitle>Upload failed</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{phase.message}</span>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  startUpload(phase.blob, phase.preview);
                }}
              >
                <IconRefresh className="size-4" />
                {WORDS.shared.photo.retry}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setPhase({ kind: 'idle' });
                }}
              >
                Dismiss
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Guidelines Panel (ReUI c-file-upload-10 guidelines) */}
      <div className="flex max-w-2xl flex-col gap-2 rounded-[var(--radius-card,1.25rem)] border border-border/60 bg-muted/20 p-4 text-xs shadow-xs">
        <div className="flex items-center gap-1.5 font-semibold text-foreground">
          <IconInfoCircle className="size-4 text-primary" />
          <span>{guidelines.title}</span>
        </div>
        <ul className="grid gap-1.5 text-muted-foreground sm:grid-cols-3">
          <li className="flex items-start gap-1.5">
            <IconCheck className="mt-0.5 size-3.5 shrink-0 text-success" />
            <span>{guidelines.subject}</span>
          </li>
          <li className="flex items-start gap-1.5">
            <IconCheck className="mt-0.5 size-3.5 shrink-0 text-success" />
            <span>{guidelines.size}</span>
          </li>
          <li className="flex items-start gap-1.5">
            <IconCheck className="mt-0.5 size-3.5 shrink-0 text-success" />
            <span>{guidelines.format}</span>
          </li>
        </ul>
      </div>

      {/* 21:9 Cropper Dialog */}
      <ResponsiveDialog
        open={Boolean(rawFileUrl)}
        onOpenChange={(open) => {
          if (!open) setRawFileUrl(null);
        }}
        breakpoint={1024}
      >
        <ResponsiveDialogContent className="sm:max-w-xl">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Crop banner</ResponsiveDialogTitle>
          </ResponsiveDialogHeader>

          {rawFileUrl && (
            <div className="relative mx-auto aspect-[21/9] w-full overflow-hidden rounded-xl border bg-black/5">
              <Cropper
                aspectRatio={BANNER_ASPECT}
                onCropComplete={(_croppedArea, croppedAreaPixels) => {
                  setCropArea(croppedAreaPixels);
                }}
              >
                <CropperImage src={rawFileUrl} alt="Banner crop preview" />
                <CropperArea />
              </Cropper>
            </div>
          )}

          <ResponsiveDialogFooter className="mt-4 flex-row justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRawFileUrl(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="shop"
              onClick={() => {
                void handleApplyCrop();
              }}
            >
              Crop & Upload
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  );
}
