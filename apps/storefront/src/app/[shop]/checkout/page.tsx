import { Checkout } from '../../../features/checkout/Checkout';
import { storefrontOrNotFound } from '../../../features/shell/shop';

/** Checkout: the cart is in this browser, so the form renders there; the shop data comes from the layout. */
export default async function CheckoutPage({ params }: { params: Promise<{ shop: string }> }) {
  await storefrontOrNotFound((await params).shop);
  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6 px-4 py-4 sm:py-6">
      <Checkout />
    </div>
  );
}
