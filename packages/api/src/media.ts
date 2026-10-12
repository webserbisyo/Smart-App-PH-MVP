import type { MediaKind } from '@smartapp/core';

import type { ApiClient } from './client';
import { throwIfError } from './errors';

// Shop images in the public `shop-media` bucket (decision P5-3). The browser makes both sizes (compressImage in
// packages/ui); paths never change, so a new image gets a new path and files are cached for a year.

export const SHOP_MEDIA_BUCKET = 'shop-media';

/** The folder under `<tenantId>/` for each kind. `save_item` only accepts item photos under `items/`. */
export const MEDIA_FOLDERS: Readonly<Record<MediaKind, string>> = {
  logo: 'logos',
  cover: 'covers',
  item: 'items',
  category: 'categories',
  qr: 'qr',
};

const ONE_YEAR_SECONDS = '31536000';

/** `<path>.webp` → `<path>-thumb.webp`. */
export function thumbPath(path: string): string {
  return path.replace(/\.webp$/, '-thumb.webp');
}

/**
 * Uploads an already compressed image in two sizes: `<tenantId>/<folder>/<uuid>.webp` and `<uuid>-thumb.webp`.
 * Returns the full-size path, which is what the tables store.
 */
export async function uploadShopMedia(
  client: ApiClient,
  tenantId: string,
  kind: MediaKind,
  files: { full: Blob; thumb: Blob },
): Promise<{ path: string }> {
  const path = `${tenantId}/${MEDIA_FOLDERS[kind]}/${crypto.randomUUID()}.webp`;
  const bucket = client.storage.from(SHOP_MEDIA_BUCKET);
  const options = { upsert: false, cacheControl: ONE_YEAR_SECONDS, contentType: 'image/webp' };
  const full = await bucket.upload(path, files.full, options);
  throwIfError(full.error);
  const thumb = await bucket.upload(thumbPath(path), files.thumb, options);
  if (thumb.error) {
    await bucket.remove([path]);
    throwIfError(thumb.error);
  }
  return { path };
}

/** Deletes images (both sizes) the shop no longer uses. Missing files are not an error. */
export async function removeShopMedia(client: ApiClient, paths: readonly string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await client.storage.from(SHOP_MEDIA_BUCKET).remove(paths.flatMap((path) => [path, thumbPath(path)]));
  throwIfError(error);
}

// The client that builds public URLs: set by whichever client the app creates (every client of an app points at
// the same project), so screens can call mediaUrl(path, size) without passing a client.
let mediaClient: ApiClient | null = null;

/** Called by the create…Client functions. */
export function setMediaClient(client: ApiClient): void {
  mediaClient = client;
}

/** The public URL of a shop image; `thumb` is the small copy for lists and cards. */
export function mediaUrl(path: string, size: 'full' | 'thumb'): string {
  if (mediaClient === null) throw new Error('mediaUrl needs a Supabase client: create one first.');
  return mediaClient.storage.from(SHOP_MEDIA_BUCKET).getPublicUrl(size === 'thumb' ? thumbPath(path) : path).data.publicUrl;
}
