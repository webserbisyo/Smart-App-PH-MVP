import { VOCAB, WORDS } from '@smartapp/core';
import { IconBuildingStore } from '@smartapp/ui/icons';
import { EmptyPage } from '@smartapp/ui/patterns/EmptyPage';

import { storefrontOrNotFound } from '../../../features/shell/shop';

export default async function CatalogPage({ params }: { params: Promise<{ shop: string }> }) {
  const { shop } = await storefrontOrNotFound((await params).shop);
  const catalog = VOCAB[shop.businessType].catalog;
  return <EmptyPage icon={<IconBuildingStore />} title={catalog} text={WORDS.storefront.empty.catalog(catalog)} />;
}
