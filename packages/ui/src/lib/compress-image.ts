// Browser image compression (decision P5-3): every photo is made smaller on the phone before it is uploaded, so
// uploads are quick on mobile data and storage stays small. Copied and trimmed from the first build's crop-image.ts.

export interface CompressOptions {
  /** Longest edge in pixels (the square's side when `square`). */
  maxSize: number;
  /** Centre-crop to a square first (logos, category photos). */
  square?: boolean;
  /** Try smaller qualities until the file is at most this many bytes. */
  maxBytes?: number;
}

/** The sizes the apps use (`docs/api-surface.md`, conventions). */
export const IMAGE_SIZES = {
  /** Product photos and the shop cover. */
  photo: { maxSize: 1600, maxBytes: 300_000 },
  /** The small copy shown in lists and cards. */
  thumb: { maxSize: 400, maxBytes: 60_000 },
  /** Shop logo and category photos. */
  logo: { maxSize: 512, square: true, maxBytes: 120_000 },
  /** Shop banner / cover at 21:9 ratio (1600 x 686). */
  banner: { maxSize: 1600, maxBytes: 300_000 },
  /** A payment account's QR: kept sharp so it still scans. */
  qr: { maxSize: 1024, maxBytes: 300_000 },
  /** A customer's payment screenshot. */
  proof: { maxSize: 1600, maxBytes: 200_000 },
} as const satisfies Record<string, CompressOptions>;

const QUALITIES = [0.85, 0.75, 0.65, 0.55, 0.45] as const;

export interface DrawBox {
  /** The part of the source to draw. */
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  /** The output size. */
  width: number;
  height: number;
}

/** Which part of a `width × height` image to draw, and at what size. Never upscales. */
export function fitSize(width: number, height: number, options: Pick<CompressOptions, 'maxSize' | 'square'>): DrawBox {
  if (options.square) {
    const side = Math.min(width, height);
    const out = Math.max(1, Math.round(Math.min(side, options.maxSize)));
    return { sx: Math.round((width - side) / 2), sy: Math.round((height - side) / 2), sw: side, sh: side, width: out, height: out };
  }
  const scale = Math.min(1, options.maxSize / Math.max(width, height));
  return {
    sx: 0,
    sy: 0,
    sw: width,
    sh: height,
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

/** WebP when the browser can encode it, else JPEG (old Safari hands back a PNG when asked for WebP). */
async function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  const webp = await toBlob(canvas, 'image/webp', quality);
  if (webp?.type === 'image/webp') return webp;
  const jpeg = await toBlob(canvas, 'image/jpeg', quality);
  if (!jpeg) throw new Error('image_encode_failed');
  return jpeg;
}

/** A photo from the phone → a smaller WebP (JPEG on old Safari). Browser only; runs when called. */
export async function compressImage(file: Blob, options: CompressOptions): Promise<Blob> {
  // createImageBitmap applies the photo's EXIF rotation, so portrait phone photos stay upright.
  const bitmap = await createImageBitmap(file);
  try {
    const box = fitSize(bitmap.width, bitmap.height, options);
    const canvas = document.createElement('canvas');
    canvas.width = box.width;
    canvas.height = box.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('image_encode_failed');
    context.imageSmoothingQuality = 'high';
    // JPEG has no transparency: start from white so transparent PNG parts don't turn black.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, box.width, box.height);
    context.drawImage(bitmap, box.sx, box.sy, box.sw, box.sh, 0, 0, box.width, box.height);

    let blob = await encode(canvas, QUALITIES[0]);
    for (const quality of QUALITIES.slice(1)) {
      if (options.maxBytes === undefined || blob.size <= options.maxBytes) break;
      blob = await encode(canvas, quality);
    }
    return blob;
  } finally {
    bitmap.close();
  }
}

/** True for the image types phones produce and the buckets accept. */
export function isImageFile(file: Blob): boolean {
  return /^image\/(jpeg|png|webp|heic|heif)$/.test(file.type);
}
