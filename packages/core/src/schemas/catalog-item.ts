import { z } from 'zod';

import { Item, ItemPhoto } from './item';
import { Uuid } from './primitives';
import { Variant } from './variant';

/**
 * An item as the dashboard catalog shows it (`useCatalog`, `save_item`): the item, its photos in order (the first is
 * the cover), its variants that are not archived, and the ids of its option groups. All statuses.
 */
export const CatalogItem = Item.extend({
  photos: z.array(ItemPhoto),
  variants: z.array(Variant),
  optionGroupIds: z.array(Uuid),
});
export type CatalogItem = z.infer<typeof CatalogItem>;
