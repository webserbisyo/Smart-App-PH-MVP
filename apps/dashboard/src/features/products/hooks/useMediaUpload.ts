import { uploadShopMedia, useApiClient } from '@smartapp/api';
import type { MediaKind } from '@smartapp/core';
import { compressImage, IMAGE_SIZES } from '@smartapp/ui/lib/compress-image';

import { useShop } from '../../../app/shop';

/**
 * The `upload` a `PhotoField` needs: the photo it already made smaller, plus the small list copy made here,
 * both stored under the shop's folder. Resolves with the `shop-media` path to save.
 */
export function useMediaUpload(kind: MediaKind) {
  const client = useApiClient();
  const shop = useShop();
  return async (full: Blob, progress: (percent: number) => void): Promise<string> => {
    const thumb = await compressImage(full, IMAGE_SIZES.thumb);
    progress(25);
    const { path } = await uploadShopMedia(client, shop.id, kind, { full, thumb });
    progress(100);
    return path;
  };
}
