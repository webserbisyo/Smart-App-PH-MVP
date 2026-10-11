import { WORDS } from '@smartapp/core';
import { IconReceipt } from '@smartapp/ui/icons';
import { EmptyPage } from '@smartapp/ui/patterns/EmptyPage';
import { PageBody } from '@smartapp/ui/patterns/PageBody';

export default function OrdersScreen() {
  return (
    <PageBody>
      <EmptyPage icon={<IconReceipt />} title={WORDS.dashboard.nav.orders} text={WORDS.dashboard.empty.orders} />
    </PageBody>
  );
}
