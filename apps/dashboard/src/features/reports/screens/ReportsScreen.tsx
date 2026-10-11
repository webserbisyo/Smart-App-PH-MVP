import { WORDS } from '@smartapp/core';
import { IconChartBar } from '@smartapp/ui/icons';
import { EmptyPage } from '@smartapp/ui/patterns/EmptyPage';
import { PageBody } from '@smartapp/ui/patterns/PageBody';

export default function ReportsScreen() {
  return (
    <PageBody>
      <EmptyPage icon={<IconChartBar />} title={WORDS.dashboard.nav.reports} text={WORDS.dashboard.empty.reports} />
    </PageBody>
  );
}
