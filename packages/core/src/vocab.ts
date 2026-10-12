import type { BusinessType } from './schemas/enums';

/** The words that change with the kind of shop. Screens use these; code says catalog, item, prep. */
export interface Vocab {
  /** The list of things for sale: "Menu" or "Products". */
  catalog: 'Menu' | 'Products';
  /** One thing for sale: "Menu item" or "Product". */
  item: 'Menu item' | 'Product';
  /** Where orders are made ready: "Kitchen" or "Packing". */
  prep: 'Kitchen' | 'Packing';
}

/** The only place the business type picks words. Nothing else branches on the business type. */
export const VOCAB: Readonly<Record<BusinessType, Vocab>> = {
  food: { catalog: 'Menu', item: 'Menu item', prep: 'Kitchen' },
  retail: { catalog: 'Products', item: 'Product', prep: 'Packing' },
};
