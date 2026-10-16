'use client';

import { useEffect, useState } from 'react';

import { WORDS } from '@smartapp/core';
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
import { IconAlertTriangle, IconCamera, IconPhotoPlus, IconRefresh, IconTrash } from '../icons';
import { compressImage } from '#lib/compress-image';
import { IMAGE_SIZES } from '#lib/compress-image';
import { cropImageToBlob } from '#lib/crop-canvas';
import { cn } from '#lib/utils';

export interface LogoFieldProps {
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

/**
 * LogoField pattern (Storefront v2 Step 10):
 * Layout based on ReUI c-file-upload-2 (avatar).
 * 1:1 aspect ratio, IMAGE_SIZES.logo (512x512).
 * Flow: pick or drop -> Cropper (1:1) -> compressImage (WebP) -> Supabase Storage upload with real percent progress.
 * Change & Remove always visible on phones (no hover required).
 */
export function LogoField({
  label = WORDS.dashboard.settings.look.logo,
  value,
  upload,
  onChange,
  disabled = false,
  className,
}: LogoFieldProps) {
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
      const cropped = await cropImageToBlob(rawFileUrl, cropArea, 1);
      const compressed = await compressImage(cropped, IMAGE_SIZES.logo);
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

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <span className="text-sm font-medium">{label}</span>

      <div className="flex flex-wrap items-center gap-4">
        {/* Avatar Container (ReUI c-file-upload-2 style) */}
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={cn(
            'group relative flex size-24 sm:size-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed bg-muted/30 transition-all',
            isDragging && 'border-primary bg-primary/5 ring-4 ring-primary/10',
            displayImage ? 'border-border/60' : 'border-muted-foreground/30',
          )}
        >
          {displayImage ? (
            <img src={displayImage} alt="" className={cn('size-full object-cover', busy && 'opacity-50')} />
          ) : (
            <div className="flex flex-col items-center justify-center gap-1 text-muted-foreground">
              <IconCamera className="size-8" />
              <span className="text-[10px] font-medium tracking-tight">1:1 Square</span>
            </div>
          )}

          {/* Upload progress ring / bar */}
          {busy && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 p-2 text-center text-xs">
              <span className="font-semibold">{phase.kind === 'compressing' ? WORDS.shared.photo.compressing : WORDS.shared.photo.uploading}</span>
              <Progress value={phase.kind === 'uploading' ? phase.percent : null} className="mt-1 h-1.5 w-16" />
            </div>
          )}
        </div>

        {/* Action Buttons: Touch-friendly & always visible on phones */}
        <div className="flex flex-col gap-2">
          <input {...getInputProps()} className="sr-only" tabIndex={-1} disabled={disabled || busy} />

          {phase.kind === 'error' ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1 text-xs text-destructive-text">
                <IconAlertTriangle className="size-4 shrink-0" />
                <span>{phase.message}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={disabled}
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
                  disabled={disabled}
                  onClick={() => {
                    setPhase({ kind: 'idle' });
                    onChange(null);
                  }}
                >
                  <IconTrash className="size-4" />
                  {WORDS.shared.photo.remove}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={disabled || busy}
                onClick={openFileDialog}
              >
                <IconPhotoPlus className="size-4" />
                {displayImage ? WORDS.shared.photo.change : WORDS.shared.photo.add}
              </Button>

              {displayImage && !busy && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={disabled}
                  onClick={() => {
                    setPhase({ kind: 'idle' });
                    onChange(null);
                  }}
                >
                  <IconTrash className="size-4" />
                  {WORDS.shared.photo.remove}
                </Button>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            {WORDS.dashboard.settings.look.logoGuidelines.size} · JPG, PNG, WebP
          </p>
        </div>
      </div>

      {/* 1:1 Cropper Dialog */}
      <ResponsiveDialog
        open={Boolean(rawFileUrl)}
        onOpenChange={(open) => {
          if (!open) setRawFileUrl(null);
        }}
        breakpoint={1024}
      >
        <ResponsiveDialogContent className="sm:max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Crop logo</ResponsiveDialogTitle>
          </ResponsiveDialogHeader>

          {rawFileUrl && (
            <div className="relative mx-auto aspect-square w-full max-w-[320px] overflow-hidden rounded-xl border bg-black/5">
              <Cropper
                aspectRatio={1}
                onCropComplete={(_croppedArea, croppedAreaPixels) => {
                  setCropArea(croppedAreaPixels);
                }}
              >
                <CropperImage src={rawFileUrl} alt="Crop preview" />
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
