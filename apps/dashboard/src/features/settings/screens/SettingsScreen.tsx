import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { useBusinessHours, useClosures, usePaymentAccounts, useShopSettings, useStampRule } from '@smartapp/api';
import { shopUrl, WORDS } from '@smartapp/core';
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from '@smartapp/ui/components/item';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { IconAddressBook, IconChevronRight, IconClock, IconCreditCard, IconGift, IconPalette, IconTruckDelivery } from '@smartapp/ui/icons';
import { CopyButton } from '@smartapp/ui/patterns/CopyButton';

import { useShop } from '../../../app/shop';
import { SettingsLoader } from '../components/SettingsPage';
import { hoursSummary, infoSummary, lookSummary, orderTypesSummary, paymentsSummary, stampsSummary } from '../summary';

const words = WORDS.dashboard.settings;

function SectionLink({ path, icon, title, summary }: { path: string; icon: ReactNode; title: string; summary: string | null }) {
  return (
    <Item variant="outline" className="bg-card" render={<Link to="/$" params={{ _splat: path }} />}>
      <ItemMedia variant="icon">{icon}</ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle>{title}</ItemTitle>
        {summary === null ? <Skeleton className="h-4 w-40" /> : <ItemDescription className="truncate">{summary}</ItemDescription>}
      </ItemContent>
      <ItemActions>
        <IconChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
      </ItemActions>
    </Item>
  );
}

/** The settings list: each section with a one-line summary, and the shop link (read-only). */
export default function SettingsScreen() {
  const shop = useShop();
  const settings = useShopSettings(shop.id);
  const hours = useBusinessHours(shop.id);
  const closures = useClosures(shop.id);
  const accounts = usePaymentAccounts(shop.id);
  const stampRule = useStampRule(shop.id);
  const link = shopUrl(shop.slug);
  const data = settings.data;

  return (
    <SettingsLoader queries={[settings]}>
      {() => (
        <>
          <div className="flex flex-col gap-2 rounded-xl border bg-card p-4">
            <span className="text-sm font-medium">{words.shopLink}</span>
            <div className="flex min-w-0 items-center gap-2">
              <span className="min-w-0 flex-1 truncate font-semibold">{link.replace(/^https:\/\//, '')}</span>
              <CopyButton value={link} words={WORDS.shared} label={WORDS.shared.share.copyLink} />
            </div>
            <p className="text-sm text-muted-foreground">{words.shopLinkHint}</p>
          </div>
          <ItemGroup className="gap-2">
            <SectionLink path="settings/look" icon={<IconPalette />} title={words.sections.look} summary={data ? lookSummary(shop.name, data) : null} />
            <SectionLink path="settings/info" icon={<IconAddressBook />} title={words.sections.info} summary={data ? infoSummary(data) : null} />
            <SectionLink
              path="settings/hours"
              icon={<IconClock />}
              title={words.sections.hours}
              summary={data && hours.data && closures.data ? hoursSummary(data, hours.data, closures.data, new Date()) : null}
            />
            <SectionLink path="settings/order-types" icon={<IconTruckDelivery />} title={words.sections.orderTypes} summary={data ? orderTypesSummary(data) : null} />
            <SectionLink path="settings/payments" icon={<IconCreditCard />} title={words.sections.payments} summary={accounts.data ? paymentsSummary(accounts.data) : null} />
            <SectionLink path="settings/stamps" icon={<IconGift />} title={words.sections.stamps} summary={stampRule.data ? stampsSummary(stampRule.data) : null} />
          </ItemGroup>
        </>
      )}
    </SettingsLoader>
  );
}
