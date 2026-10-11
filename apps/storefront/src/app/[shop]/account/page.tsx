import { WORDS } from '@smartapp/core';
import { IconUser } from '@smartapp/ui/icons';
import { EmptyPage } from '@smartapp/ui/patterns/EmptyPage';

export default function AccountPage() {
  return <EmptyPage icon={<IconUser />} title={WORDS.storefront.nav.account} text={WORDS.storefront.empty.account} />;
}
