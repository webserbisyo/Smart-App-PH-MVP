import { MyOrders } from '../../../features/orders/MyOrders';
import { storefrontOrNotFound } from '../../../features/shell/shop';

/** My orders: the orders placed on this phone (their links are kept in this browser). */
export default async function OrdersPage({ params }: { params: Promise<{ shop: string }> }) {
  await storefrontOrNotFound((await params).shop);
  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6 px-4 py-4 sm:py-6">
      <MyOrders />
    </div>
  );
}
