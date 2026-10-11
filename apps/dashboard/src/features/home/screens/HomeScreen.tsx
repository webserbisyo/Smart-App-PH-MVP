import { WORDS } from '@smartapp/core';
import { IconHome } from '@smartapp/ui/icons';
import { EmptyPage } from '@smartapp/ui/patterns/EmptyPage';
import { PageBody } from '@smartapp/ui/patterns/PageBody';

export default function HomeScreen() {
  return (
    <PageBody>
      <EmptyPage icon={<IconHome />} title={WORDS.dashboard.nav.home} text={WORDS.dashboard.empty.home} />
    </PageBody>
  );
}
