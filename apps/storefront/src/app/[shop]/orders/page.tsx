import { MyOrders } from '../../../features/orders/MyOrders';
import { storefrontOrNotFound } from '../../../features/shell/shop';

/** My orders: the orders placed on this phone (their links are kept in this browser). */
export default async function OrdersPage({ params }: { params: Promise<{ shop: string }> }) {
  await storefrontOrNotFound((await params).shop);
  return <MyOrders />;
}
