import { WORDS } from '@smartapp/core';
import { IconUsers } from '@smartapp/ui/icons';
import { EmptyPage } from '@smartapp/ui/patterns/EmptyPage';
import { PageBody } from '@smartapp/ui/patterns/PageBody';

export default function CustomersScreen() {
  return (
    <PageBody>
      <EmptyPage icon={<IconUsers />} title={WORDS.dashboard.nav.customers} text={WORDS.dashboard.empty.customers} />
    </PageBody>
  );
}
