import { WORDS } from '@smartapp/core';
import { IconReceipt } from '@smartapp/ui/icons';
import { EmptyPage } from '@smartapp/ui/patterns/EmptyPage';

export default function OrdersPage() {
  return <EmptyPage icon={<IconReceipt />} title={WORDS.storefront.nav.orders} text={WORDS.storefront.empty.orders} />;
}
