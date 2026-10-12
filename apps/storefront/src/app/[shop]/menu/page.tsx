import { CatalogBrowser } from '../../../features/catalog/CatalogBrowser';
import { storefrontOrNotFound } from '../../../features/shell/shop';

/** Menu or Products: search, category chips and sections. The data comes from the shop layout. */
export default async function CatalogPage({ params }: { params: Promise<{ shop: string }> }) {
  await storefrontOrNotFound((await params).shop);
  return <CatalogBrowser />;
}
