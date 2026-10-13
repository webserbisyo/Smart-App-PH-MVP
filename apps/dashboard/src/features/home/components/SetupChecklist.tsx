import { Link } from '@tanstack/react-router';

import { useBusinessHours, useCatalog, useDeliveryZones, usePaymentAccounts, useShopSettings } from '@smartapp/api';
import { setupChecklist, WORDS } from '@smartapp/core';
import type { SetupStep } from '@smartapp/core';
import { Item, ItemActions, ItemContent, ItemGroup, ItemMedia, ItemTitle } from '@smartapp/ui/components/item';
import { Progress } from '@smartapp/ui/components/progress';
import { IconChevronRight, IconCircleCheckFilled } from '@smartapp/ui/icons';
import { cn } from '@smartapp/ui/lib/utils';

import { useShop, useVocab } from '../../../app/shop';

const words = WORDS.dashboard.home.setup;

/** Where each step is done. */
const STEP_PATHS: Record<SetupStep, string> = {
  logo: 'settings/look',
  hours: 'settings/hours',
  payment: 'settings/payments',
  product: 'products/new',
  orderTypes: 'settings/order-types',
};

/**
 * The setup checklist (paper 6.1): five rows with progress, each linking to its screen. Shows once everything it
 * reads has loaded, and not at all when every step is done.
 */
export function SetupChecklist() {
  const shop = useShop();
  const vocab = useVocab();
  const settings = useShopSettings(shop.id);
  const hours = useBusinessHours(shop.id);
  const accounts = usePaymentAccounts(shop.id);
  const catalog = useCatalog(shop.id);
  const zones = useDeliveryZones(shop.id);
  if (!settings.data || !hours.data || !accounts.data || !catalog.data || !zones.data) return null;

  const checklist = setupChecklist({
    settings: settings.data,
    hourCount: hours.data.length,
    accounts: accounts.data,
    itemCount: catalog.data.filter((item) => item.status !== 'archived').length,
    zones: zones.data,
  });
  if (checklist.complete) return null;
  const titles: Record<SetupStep, string> = { ...words.steps, product: words.steps.product(vocab.item) };

  return (
    <section aria-labelledby="setup-title" className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="setup-title" className="font-semibold">
          {words.title}
        </h2>
        <span className="tabular text-sm text-muted-foreground">{words.progress(checklist.done, checklist.total)}</span>
      </div>
      <Progress value={(checklist.done / checklist.total) * 100} aria-label={words.progress(checklist.done, checklist.total)} />
      <ItemGroup className="gap-1">
        {checklist.steps.map(({ step, done }) => (
          <Item key={step} size="sm" render={<Link to="/$" params={{ _splat: STEP_PATHS[step] }} />}>
            <ItemMedia>
              {done ? (
                <IconCircleCheckFilled aria-label={words.done} className="size-5 text-success-text" />
              ) : (
                <span aria-hidden="true" className="size-5 rounded-full border-2 border-dashed border-muted-foreground/50" />
              )}
            </ItemMedia>
            <ItemContent className="min-w-0">
              <ItemTitle className={cn(done && 'text-muted-foreground line-through')}>{titles[step]}</ItemTitle>
            </ItemContent>
            <ItemActions>
              <IconChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
            </ItemActions>
          </Item>
        ))}
      </ItemGroup>
    </section>
  );
}
