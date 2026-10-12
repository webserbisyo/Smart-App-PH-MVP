import { mediaUrl } from '@smartapp/api';
import { WORDS } from '@smartapp/core';
import { Badge } from '@smartapp/ui/components/badge';
import { Button } from '@smartapp/ui/components/button';
import { Sortable, SortableContent, SortableItem, SortableItemHandle } from '@smartapp/ui/components/sortable';
import { IconGripVertical, IconX } from '@smartapp/ui/icons';
import { IMAGE_SIZES } from '@smartapp/ui/lib/compress-image';
import { PhotoField } from '@smartapp/ui/patterns/PhotoField';

import { MAX_PHOTOS } from '../form';
import { useMediaUpload } from '../hooks/useMediaUpload';

const words = WORDS.dashboard.products.editor;

export interface EditorPhotosProps {
  value: readonly { path: string }[];
  onChange: (photos: { path: string }[]) => void;
  disabled: boolean;
}

/** Up to five photos: drag to sort (the first is the cover), remove, and add one at a time (made smaller first). */
export function EditorPhotos({ value, onChange, disabled }: EditorPhotosProps) {
  const upload = useMediaUpload('item');
  return (
    <div className="flex flex-col gap-3">
      {value.length > 0 ? (
        <Sortable
          value={[...value]}
          getItemValue={(photo) => photo.path}
          orientation="mixed"
          onValueChange={(next) => {
            onChange(next);
          }}
        >
          <SortableContent render={<ul />} className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {value.map((photo, index) => (
              <SortableItem key={photo.path} value={photo.path} render={<li />} className="relative aspect-square overflow-hidden rounded-lg border bg-muted">
                <img src={mediaUrl(photo.path, 'thumb')} alt="" className="size-full object-cover" draggable={false} />
                {index === 0 ? <Badge className="absolute bottom-1 left-1">{words.cover}</Badge> : null}
                <SortableItemHandle
                  disabled={disabled}
                  render={<Button variant="secondary" size="icon-sm" className="absolute top-1 left-1 opacity-90" aria-label={words.movePhoto(index + 1)} />}
                >
                  <IconGripVertical />
                </SortableItemHandle>
                <Button
                  variant="secondary"
                  size="icon-sm"
                  className="absolute top-1 right-1 opacity-90"
                  aria-label={words.removePhoto(index + 1)}
                  disabled={disabled}
                  onClick={() => {
                    onChange(value.filter((other) => other.path !== photo.path));
                  }}
                >
                  <IconX />
                </Button>
              </SortableItem>
            ))}
          </SortableContent>
        </Sortable>
      ) : null}
      {value.length < MAX_PHOTOS ? (
        <PhotoField
          label={WORDS.shared.photo.add}
          value={null}
          upload={upload}
          onChange={(path) => {
            if (path) onChange([...value, { path }]);
          }}
          compress={IMAGE_SIZES.photo}
          words={WORDS.shared.photo}
          shape="square"
          disabled={disabled}
        />
      ) : null}
    </div>
  );
}
