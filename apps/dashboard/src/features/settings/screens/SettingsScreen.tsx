import { WORDS } from '@smartapp/core';
import { IconSettings } from '@smartapp/ui/icons';
import { EmptyPage } from '@smartapp/ui/patterns/EmptyPage';
import { PageBody } from '@smartapp/ui/patterns/PageBody';

export default function SettingsScreen() {
  return (
    <PageBody>
      <EmptyPage icon={<IconSettings />} title={WORDS.dashboard.nav.settings} text={WORDS.dashboard.empty.settings} />
    </PageBody>
  );
}
