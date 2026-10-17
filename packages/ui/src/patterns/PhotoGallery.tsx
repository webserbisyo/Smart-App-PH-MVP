'use client';

import { useEffect, useId, useRef, useState } from 'react';
import {
  IconGripVertical,
  IconPhotoPlus,
  IconRefresh,
  IconTrash,
  IconX,
} from '@tabler/icons-react';

import { useValueAsRef } from '@base-ui/utils/useValueAsRef';
import { WORDS } from '@smartapp/core';
import { Badge } from '#components/badge';
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
import {
  Sortable,
  SortableContent,
  SortableItem,
  SortableItemHandle,
} from '#components/sortable';
import { compressImage, IMAGE_SIZES, isImageFile } from '#lib/compress-image';
import { cropImageToBlob } from '#lib/crop-canvas';
import { cn } from '#lib/utils';

export interface PhotoGalleryProps {
  value: readonly { path: string }[];
  onChange: (photos: { path: string }[]) => void;
  resolveUrl: (path: string) => string;
  upload: (
    blob: { full: Blob; thumb: Blob },
    onProgress: (percent: number) => void,
  ) => Promise<string>;
  aspectRatio?: number | undefined;
  disabled?: boolean | undefined;
  onBusyChange?: ((busy: boolean) => void) | undefined;
  maxPhotos?: number | undefined;
  className?: string | undefined;
}

interface UploadTask {
  id: string;
  file: File;
  previewUrl: string;
  status: 'pending_crop' | 'compressing' | 'queued' | 'uploading' | 'failed';
  percent: number;
  fullBlob?: Blob;
  thumbBlob?: Blob;
}

const words = WORDS.dashboard.products.editor;
const CONCURRENT_LIMIT = 2;

/**
 * PhotoGallery pattern:
 * - Multi-photo upload up to MAX_PHOTOS (5).
 * - Multi-file drag & drop / picker (c-file-upload-4 grid + c-file-upload-8 sorting).
 * - Progress summary row (c-file-upload-5): total progress bar, status text, and "Retry failed".
 * - Step-by-step or center crop at target aspect ratio (1:1 food, 4:5 apparel).
 * - Compresses both full (1600px, 300KB) and thumb (400px, 60KB).
 * - Concurrency limited to at most 2 uploads at a time.
 * - Each tile shows its real progress percent and Retry/Remove.
 * - Sortable reordering (first photo is cover).
 */
export function PhotoGallery({
  value,
  onChange,
  resolveUrl,
  upload,
  aspectRatio = 1,
  disabled = false,
  onBusyChange,
  maxPhotos = 5,
  className,
}: PhotoGalleryProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [currentCroppingIndex, setCurrentCroppingIndex] = useState<number | null>(null);
  const [cropArea, setCropArea] = useState<CropperAreaData | null>(null);
  const [tooManyError, setTooManyError] = useState<string | null>(null);

  // Synchronization refs for async worker queue
  const tasksRef = useValueAsRef(tasks);
  const valueRef = useValueAsRef(value);
  const onChangeRef = useValueAsRef(onChange);
  const uploadRef = useValueAsRef(upload);
  const runningUploadsRef = useRef(0);
  const queueRef = useRef<string[]>([]);

  // Clean up object URLs when unmounted or removed
  const previewUrlsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const currentUrls = new Set(tasks.map((t) => t.previewUrl));
    for (const url of previewUrlsRef.current) {
      if (!currentUrls.has(url)) {
        URL.revokeObjectURL(url);
      }
    }
    previewUrlsRef.current = currentUrls;
  }, [tasks]);

  useEffect(() => {
    return () => {
      for (const url of previewUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  // Track busy state for parent form (save button disabled while uploading/cropping)
  const isBusy = tasks.some(
    (t) =>
      t.status === 'pending_crop' ||
      t.status === 'compressing' ||
      t.status === 'queued' ||
      t.status === 'uploading',
  );

  const prevBusyRef = useRef(isBusy);
  useEffect(() => {
    if (prevBusyRef.current !== isBusy) {
      prevBusyRef.current = isBusy;
      onBusyChange?.(isBusy);
    }
  }, [isBusy, onBusyChange]);

  // Worker runner for concurrency <= 2
  const processQueue = () => {
    while (runningUploadsRef.current < CONCURRENT_LIMIT && queueRef.current.length > 0) {
      const nextTaskId = queueRef.current.shift();
      if (!nextTaskId) break;

      const task = tasksRef.current.find((t) => t.id === nextTaskId);
      if (!task || !task.fullBlob || !task.thumbBlob) {
        continue;
      }

      runningUploadsRef.current += 1;
      const { fullBlob, thumbBlob } = task;

      setTasks((prev) =>
        prev.map((t) => (t.id === nextTaskId ? { ...t, status: 'uploading', percent: 10 } : t)),
      );

      void uploadRef
        .current({ full: fullBlob, thumb: thumbBlob }, (percent) => {
          setTasks((prev) =>
            prev.map((t) => (t.id === nextTaskId ? { ...t, percent } : t)),
          );
        })
        .then(
          (savedPath) => {
            onChangeRef.current([...valueRef.current, { path: savedPath }]);
            setTasks((prev) => prev.filter((t) => t.id !== nextTaskId));
          },
          () => {
            setTasks((prev) =>
              prev.map((t) =>
                t.id === nextTaskId ? { ...t, status: 'failed', percent: 0 } : t,
              ),
            );
          },
        )
        .finally(() => {
          runningUploadsRef.current = Math.max(0, runningUploadsRef.current - 1);
          processQueue();
        });
    }
  };

  const handleFilesSelected = (files: FileList | File[]) => {
    setTooManyError(null);
    const validFiles = Array.from(files).filter(isImageFile);
    if (validFiles.length === 0) return;

    const availableSlots = maxPhotos - value.length - tasks.length;
    if (availableSlots <= 0) {
      setTooManyError(words.tooManyPhotos(validFiles.length, maxPhotos));
      return;
    }

    let acceptedFiles = validFiles;
    if (validFiles.length > availableSlots) {
      acceptedFiles = validFiles.slice(0, availableSlots);
      setTooManyError(words.tooManyPhotos(validFiles.length, maxPhotos));
    }

    const newTasks: UploadTask[] = acceptedFiles.map((file, i) => ({
      id: `${String(Date.now())}-${String(i)}-${file.name}`,
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'pending_crop',
      percent: 0,
    }));

    setTasks((prev) => {
      const updated = [...prev, ...newTasks];
      const firstPendingIndex = updated.findIndex((t) => t.status === 'pending_crop');
      if (firstPendingIndex !== -1) {
        setCurrentCroppingIndex(firstPendingIndex);
      }
      return updated;
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleApplySingleCrop = async () => {
    if (currentCroppingIndex === null || !tasks[currentCroppingIndex]) return;
    const task = tasks[currentCroppingIndex];

    try {
      const croppedBlob = await cropImageToBlob(task.previewUrl, cropArea, aspectRatio);
      const full = await compressImage(croppedBlob, IMAGE_SIZES.photo);
      const thumb = await compressImage(croppedBlob, IMAGE_SIZES.thumb);

      setTasks((prev) => {
        const next = prev.map((t) =>
          t.id === task.id
            ? { ...t, status: 'queued' as const, fullBlob: full, thumbBlob: thumb }
            : t,
        );
        const nextCropIndex = next.findIndex((t) => t.status === 'pending_crop');
        setCurrentCroppingIndex(nextCropIndex !== -1 ? nextCropIndex : null);
        return next;
      });

      setCropArea(null);
      queueRef.current.push(task.id);
      processQueue();
    } catch {
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: 'failed' as const } : t)),
      );
      setCurrentCroppingIndex(null);
    }
  };

  const handleConfirmAllCenterCrop = async () => {
    setCurrentCroppingIndex(null);
    setCropArea(null);

    const pending = tasks.filter((t) => t.status === 'pending_crop');
    for (const task of pending) {
      try {
        const cropped = await cropImageToBlob(task.previewUrl, null, aspectRatio);
        const full = await compressImage(cropped, IMAGE_SIZES.photo);
        const thumb = await compressImage(cropped, IMAGE_SIZES.thumb);

        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id
              ? { ...t, status: 'queued' as const, fullBlob: full, thumbBlob: thumb }
              : t,
          ),
        );
        queueRef.current.push(task.id);
      } catch {
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: 'failed' as const } : t)),
        );
      }
    }
    processQueue();
  };

  const handleRetryTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: 'queued' as const, percent: 0 } : t)),
    );
    queueRef.current.push(taskId);
    processQueue();
  };

  const handleRetryAllFailed = () => {
    const failedTasks = tasks.filter((t) => t.status === 'failed');
    setTasks((prev) =>
      prev.map((t) => (t.status === 'failed' ? { ...t, status: 'queued' as const, percent: 0 } : t)),
    );
    for (const task of failedTasks) {
      queueRef.current.push(task.id);
    }
    processQueue();
  };

  const handleRemoveTask = (taskId: string) => {
    queueRef.current = queueRef.current.filter((id) => id !== taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  // Calculations for summary row
  const totalTasksCount = tasks.length;
  const failedTasksCount = tasks.filter((t) => t.status === 'failed').length;
  const completedOrUploadedCount = value.length;
  const activePercents = tasks.map((t) => t.percent);
  const averagePercent =
    activePercents.length > 0
      ? Math.round(activePercents.reduce((a, b) => a + b, 0) / activePercents.length)
      : 0;

  const currentCroppingTask =
    currentCroppingIndex !== null ? tasks[currentCroppingIndex] : null;

  const availableSlots = maxPhotos - value.length - tasks.length;

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Hidden native multi-file input */}
      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/heic"
        disabled={disabled || availableSlots <= 0}
        onChange={(e) => {
          if (e.target.files) handleFilesSelected(e.target.files);
        }}
        className="sr-only"
      />

      {/* Error message when exceeding photo limit */}
      {tooManyError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive-text">
          {tooManyError}
        </div>
      )}

      {/* Progress summary row (c-file-upload-5) */}
      {totalTasksCount > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border bg-muted/40 p-3 shadow-2xs">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">
              {words.photoSummary(
                completedOrUploadedCount,
                completedOrUploadedCount + totalTasksCount,
                failedTasksCount,
              )}
            </span>
            {failedTasksCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRetryAllFailed}
                className="h-7 text-xs text-destructive hover:bg-destructive/10"
              >
                <IconRefresh className="size-3.5" />
                <span>{words.retryFailed}</span>
              </Button>
            )}
          </div>
          <Progress value={averagePercent} className="h-1.5 w-full" />
        </div>
      )}

      {/* Photo Grid (c-file-upload-4 + c-file-upload-8 sorting) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {/* Uploaded Sortable Photos */}
        {value.length > 0 && (
          <Sortable
            value={[...value]}
            getItemValue={(photo) => photo.path}
            orientation="mixed"
            onValueChange={(next) => {
              onChange(next);
            }}
          >
            <SortableContent className="contents">
              {value.map((photo, index) => (
                <SortableItem
                  key={photo.path}
                  value={photo.path}
                  className="relative group overflow-hidden rounded-xl border bg-card shadow-2xs"
                  style={{ aspectRatio }}
                >
                  <img
                    src={resolveUrl(photo.path)}
                    alt=""
                    className="size-full object-cover"
                    draggable={false}
                  />

                  {index === 0 && (
                    <Badge className="absolute bottom-1.5 left-1.5 z-10 text-[10px] py-0 px-1.5 shadow-xs">
                      {words.cover}
                    </Badge>
                  )}

                  <div className="absolute top-1.5 inset-x-1.5 flex items-center justify-between z-10">
                    <SortableItemHandle
                      type="button"
                      disabled={disabled}
                      className="cursor-grab p-1 rounded-md bg-black/60 text-white shadow-xs backdrop-blur-xs hover:bg-black/80 active:cursor-grabbing"
                      aria-label={words.movePhoto(index + 1)}
                    >
                      <IconGripVertical className="size-3.5" />
                    </SortableItemHandle>

                    <Button
                      type="button"
                      variant="secondary"
                      size="icon-sm"
                      className="size-6 rounded-md bg-black/60 text-white shadow-xs backdrop-blur-xs hover:bg-destructive"
                      aria-label={words.removePhoto(index + 1)}
                      disabled={disabled}
                      onClick={() => {
                        onChange(value.filter((p) => p.path !== photo.path));
                      }}
                    >
                      <IconX className="size-3.5" />
                    </Button>
                  </div>
                </SortableItem>
              ))}
            </SortableContent>
          </Sortable>
        )}

        {/* Uploading / Pending Queue Tiles */}
        {tasks.map((task) => (
          <div
            key={task.id}
            className={cn(
              'relative overflow-hidden rounded-xl border border-dashed shadow-2xs flex flex-col items-center justify-center p-2',
              task.status === 'failed'
                ? 'border-destructive bg-destructive/10'
                : 'border-border/80 bg-muted/30',
            )}
            style={{ aspectRatio }}
          >
            <img
              src={task.previewUrl}
              alt=""
              className="absolute inset-0 size-full object-cover opacity-40 blur-xs"
            />

            <div className="relative z-10 flex flex-col items-center gap-1 text-center p-2">
              {task.status === 'failed' ? (
                <>
                  <span className="text-[11px] font-semibold text-destructive">Failed</span>
                  <div className="flex items-center gap-1 mt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => {
                        handleRetryTask(task.id);
                      }}
                      className="size-6"
                      aria-label="Retry upload"
                    >
                      <IconRefresh className="size-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => {
                        handleRemoveTask(task.id);
                      }}
                      className="size-6 text-destructive"
                      aria-label="Remove failed item"
                    >
                      <IconTrash className="size-3" />
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <span className="text-xs font-bold tabular-nums text-foreground drop-shadow-xs">
                    {task.status === 'pending_crop' ? 'Crop' : `${String(task.percent)}%`}
                  </span>
                  <Progress value={task.percent} className="h-1 w-12" />
                </>
              )}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute top-1 right-1 size-6 rounded-md bg-black/60 text-white z-20 hover:bg-destructive"
              onClick={() => {
                handleRemoveTask(task.id);
              }}
              aria-label="Cancel upload"
            >
              <IconX className="size-3" />
            </Button>
          </div>
        ))}

        {/* Add photo dropzone tile */}
        {availableSlots > 0 && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              fileInputRef.current?.click();
            }}
            onDragOver={(e) => {
              e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              handleFilesSelected(e.dataTransfer.files);
            }}
            className="group relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/80 bg-muted/20 hover:bg-shop-10/5 hover:border-shop-10/50 transition-colors focus:outline-hidden disabled:opacity-50 cursor-pointer"
            style={{ aspectRatio }}
            aria-label={words.addPhotos}
          >
            <div className="flex size-9 items-center justify-center rounded-lg bg-shop-10/10 text-shop-10 group-hover:scale-105 transition-transform">
              <IconPhotoPlus className="size-5" />
            </div>
            <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">
              {words.addPhotos}
            </span>
          </button>
        )}
      </div>

      {/* Cropper Modal for Individual or Batch Crop */}
      <ResponsiveDialog
        open={Boolean(currentCroppingTask)}
        onOpenChange={(open) => {
          if (!open) {
            setCurrentCroppingIndex(null);
          }
        }}
      >
        <ResponsiveDialogContent className="max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{words.cropTitle}</ResponsiveDialogTitle>
          </ResponsiveDialogHeader>

          {currentCroppingTask && (
            <div
              className="relative w-full overflow-hidden rounded-xl bg-black/90 shadow-inner"
              style={{ maxHeight: '50vh', aspectRatio }}
            >
              <Cropper
                aspectRatio={aspectRatio}
                onCropAreaChange={(_area, pixels) => {
                  setCropArea(pixels);
                }}
              >
                <CropperImage src={currentCroppingTask.previewUrl} />
                <CropperArea />
              </Cropper>
            </div>
          )}

          <ResponsiveDialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void handleConfirmAllCenterCrop();
              }}
            >
              {words.confirmCenterCrop}
            </Button>
            <Button
              type="button"
              onClick={() => {
                void handleApplySingleCrop();
              }}
            >
              {words.cropAndUpload}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  );
}
