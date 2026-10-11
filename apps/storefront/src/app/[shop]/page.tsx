import { WORDS } from '@smartapp/core';
import { IconHome } from '@smartapp/ui/icons';
import { EmptyPage } from '@smartapp/ui/patterns/EmptyPage';

import { shopOrNotFound } from '../../features/shell/shop';

export default async function ShopHomePage({ params }: { params: Promise<{ shop: string }> }) {
  const shop = shopOrNotFound((await params).shop);
  return <EmptyPage icon={<IconHome />} title={shop.name} text={WORDS.storefront.empty.home} />;
}
