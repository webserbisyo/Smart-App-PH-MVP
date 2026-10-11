import { WORDS } from '@smartapp/core';
import { IconPackage } from '@smartapp/ui/icons';
import { EmptyPage } from '@smartapp/ui/patterns/EmptyPage';
import { PageBody } from '@smartapp/ui/patterns/PageBody';

export default function ProductsScreen() {
  return (
    <PageBody>
      <EmptyPage icon={<IconPackage />} title={WORDS.dashboard.nav.products} text={WORDS.dashboard.empty.products} />
    </PageBody>
  );
}
