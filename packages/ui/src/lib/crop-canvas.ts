export interface CropPixels {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Crops an image URL using canvas to the specified crop rectangle or aspect ratio.
 * Returns a high-quality WebP blob ready for compressImage.
 */
export async function cropImageToBlob(
  imageSrc: string,
  crop: CropPixels | null,
  targetAspect?: number,
): Promise<Blob> {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    image.onload = () => {
      resolve();
    };
    image.onerror = () => {
      reject(new Error('Failed to load image for cropping'));
    };
    image.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  let sx = 0;
  let sy = 0;
  let sw = image.naturalWidth;
  let sh = image.naturalHeight;

  if (crop && crop.width > 0 && crop.height > 0) {
    sx = Math.max(0, Math.round(crop.x));
    sy = Math.max(0, Math.round(crop.y));
    sw = Math.min(image.naturalWidth - sx, Math.round(crop.width));
    sh = Math.min(image.naturalHeight - sy, Math.round(crop.height));
  } else if (targetAspect) {
    const naturalAspect = image.naturalWidth / image.naturalHeight;
    if (naturalAspect > targetAspect) {
      sw = Math.round(image.naturalHeight * targetAspect);
      sx = Math.round((image.naturalWidth - sw) / 2);
    } else {
      sh = Math.round(image.naturalWidth / targetAspect);
      sy = Math.round((image.naturalHeight - sh) / 2);
    }
  }

  canvas.width = Math.max(1, sw);
  canvas.height = Math.max(1, sh);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob failed'));
    }, 'image/webp', 0.95);
  });
}
