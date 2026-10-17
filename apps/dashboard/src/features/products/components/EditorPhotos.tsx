import { mediaUrl } from '@smartapp/api';
import { PhotoGallery } from '@smartapp/ui/patterns/PhotoGallery';

import { usePrecompressedUpload } from '../../../app/media';
import { useShop } from '../../../app/shop';

export interface EditorPhotosProps {
  value: readonly { path: string }[];
  onChange: (photos: { path: string }[]) => void;
  disabled: boolean;
  onBusyChange?: (busy: boolean) => void;
}

/**
 * Adapter wrapping PhotoGallery for backward compatibility.
 */
export function EditorPhotos({ value, onChange, disabled, onBusyChange }: EditorPhotosProps) {
  const upload = usePrecompressedUpload('item');
  const shop = useShop();
  const aspectRatio = shop.businessType === 'food' ? 1 : 4 / 5;

  return (
    <PhotoGallery
      value={value}
      onChange={onChange}
      resolveUrl={(path) => mediaUrl(path, 'thumb')}
      upload={upload}
      aspectRatio={aspectRatio}
      disabled={disabled}
      onBusyChange={onBusyChange}
    />
  );
}
