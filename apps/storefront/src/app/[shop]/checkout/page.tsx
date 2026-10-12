import { WORDS } from '@smartapp/core';
import { IconShoppingBagCheck } from '@smartapp/ui/icons';
import { EmptyPage } from '@smartapp/ui/patterns/EmptyPage';

import { storefrontOrNotFound } from '../../../features/shell/shop';

/** Checkout is built in P4.4; until then the cart's Checkout button lands here. */
export default async function CheckoutPage({ params }: { params: Promise<{ shop: string }> }) {
  await storefrontOrNotFound((await params).shop);
  return <EmptyPage icon={<IconShoppingBagCheck />} title={WORDS.storefront.cart.title} text={WORDS.storefront.empty.checkout} />;
}
