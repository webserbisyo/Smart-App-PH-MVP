// Canvas-based dominant color extraction helper.

function rgbToHex(r: number, g: number, b: number): string {
  const hex = [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `#${hex.toUpperCase()}`;
}

/**
 * Extracts the dominant brand colour from an image (logo, photo) using an offscreen canvas.
 * Filters out transparent, pure white, and pure black pixels to find the most representative color.
 */
export async function dominantColor(source: string | Blob | HTMLImageElement): Promise<string> {
  let img: HTMLImageElement;

  if (typeof source === 'string') {
    img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        resolve();
      };
      img.onerror = () => {
        reject(new Error(`Failed to load image from: ${source}`));
      };
      img.src = source;
    });
  } else if (source instanceof Blob) {
    const objectUrl = URL.createObjectURL(source);
    img = new Image();
    try {
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          resolve();
        };
        img.onerror = () => {
          reject(new Error('Failed to load image from Blob'));
        };
        img.src = objectUrl;
      });
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } else {
    img = source;
  }

  const canvas = document.createElement('canvas');
  const size = 32;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '#1F1F1F';

  ctx.drawImage(img, 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size).data;

  // Bucket colors into 16x16x16 quantization bins
  const bins = new Map<number, { r: number; g: number; b: number; count: number }>();

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    const a = data[i + 3] ?? 0;

    if (a < 128) continue; // Skip semi-transparent

    // Skip pure white or pure black
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    if (brightness > 245 || brightness < 15) continue;

    // Quantize 8-bit to 4-bit (16 levels per channel)
    const qr = Math.floor(r / 16);
    const qg = Math.floor(g / 16);
    const qb = Math.floor(b / 16);
    const key = (qr << 8) | (qg << 4) | qb;

    const existing = bins.get(key);
    if (existing) {
      existing.r += r;
      existing.g += g;
      existing.b += b;
      existing.count += 1;
    } else {
      bins.set(key, { r, g, b, count: 1 });
    }
  }

  let best: { r: number; g: number; b: number; count: number } | null = null;
  for (const item of bins.values()) {
    if (!best || item.count > best.count) {
      best = item;
    }
  }

  if (!best) return '#1F1F1F';

  const avgR = Math.round(best.r / best.count);
  const avgG = Math.round(best.g / best.count);
  const avgB = Math.round(best.b / best.count);

  return rgbToHex(avgR, avgG, avgB);
}
