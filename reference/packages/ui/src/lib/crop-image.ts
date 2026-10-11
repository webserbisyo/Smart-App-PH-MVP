/** The area a person picked in the cropper, in the source image's pixels. */
export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Profile photos are saved at this size. */
export const AVATAR_OUTPUT_PX = 512;
/** Item photos, QR codes and payment screenshots: longest edge. */
export const PHOTO_MAX_EDGE_PX = 1600;
const QUALITY = 0.85;

export type ImageExt = 'webp' | 'jpg';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve(image);
    };
    image.onerror = () => {
      reject(new Error('The photo could not be read'));
    };
    image.src = src;
  });
}

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, QUALITY);
  });
}

/** WebP when the browser can encode it, otherwise JPEG (Safari hands back a PNG for WebP). */
async function encode(canvas: HTMLCanvasElement): Promise<{ blob: Blob; ext: ImageExt }> {
  const webp = await toBlob(canvas, 'image/webp');
  if (webp && webp.type === 'image/webp') return { blob: webp, ext: 'webp' };
  const jpeg = await toBlob(canvas, 'image/jpeg');
  if (!jpeg) throw new Error('The photo could not be saved');
  return { blob: jpeg, ext: 'jpg' };
}

/**
 * The picked area (or the whole image) scaled so its longest edge is at most `maxEdge`, as WebP 0.85
 * (JPEG on Safari). Runs only in the browser, when called.
 */
export async function compressImage(src: string, area: CropArea | null, maxEdge: number = PHOTO_MAX_EDGE_PX): Promise<{ blob: Blob; ext: ImageExt }> {
  const image = await loadImage(src);
  const box = area ?? { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight };
  const scale = Math.min(1, maxEdge / Math.max(box.width, box.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(box.width * scale));
  canvas.height = Math.max(1, Math.round(box.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No canvas');
  context.imageSmoothingQuality = 'high';
  // JPEG has no transparency: start from white so transparent PNG parts don't turn black.
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, box.x, box.y, box.width, box.height, 0, 0, canvas.width, canvas.height);
  return encode(canvas);
}

/** The picked square as a 512×512 profile photo. */
export async function cropToAvatar(src: string, area: CropArea): Promise<{ blob: Blob; ext: ImageExt }> {
  const image = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_OUTPUT_PX;
  canvas.height = AVATAR_OUTPUT_PX;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No canvas');
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, AVATAR_OUTPUT_PX, AVATAR_OUTPUT_PX);
  return encode(canvas);
}

/** Pixel size of an aspect name: `1:1` → 1, `4:5` → 0.8; `free` → undefined (no fixed shape). */
export function aspectRatio(aspect: '1:1' | '4:5' | 'free'): number | undefined {
  if (aspect === 'free') return undefined;
  return aspect === '1:1' ? 1 : 4 / 5;
}
