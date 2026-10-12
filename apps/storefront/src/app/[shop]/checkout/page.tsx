import { Checkout } from '../../../features/checkout/Checkout';
import { storefrontOrNotFound } from '../../../features/shell/shop';

/** Checkout: the cart is in this browser, so the form renders there; the shop data comes from the layout. */
export default async function CheckoutPage({ params }: { params: Promise<{ shop: string }> }) {
  await storefrontOrNotFound((await params).shop);
  return <Checkout />;
}
