import { useEffect } from 'react';

import { useDashboardToday, useMemberInsights } from '@smartapp/api';
import { dayPart, formatShortDate, messengerShareLink, shopUrl, WORDS } from '@smartapp/core';
import { Button, buttonVariants } from '@smartapp/ui/components/button';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from '@smartapp/ui/components/responsive-dialog';
import { useFormFactor } from '@smartapp/ui/hooks/use-form-factor';
import { IconBrandMessenger, IconChartBar, IconQrcode } from '@smartapp/ui/icons';
import { PageBody } from '@smartapp/ui/patterns/PageBody';
import { QueryState } from '@smartapp/ui/patterns/QueryState';
import { ShareShop } from '@smartapp/ui/patterns/ShareShop';

import { useShop } from '../../../app/shop';
import { useToday } from '../../../app/today';
import { BestSellersToday, InProgress, MembersCard } from '../components/HomeCards';
import { SetupChecklist } from '../components/SetupChecklist';
import { AttentionChips, TodaySkeleton, TodayStats } from '../components/TodayCards';

const words = WORDS.dashboard.home;
const shared = WORDS.shared;

/**
 * Home (paper 9.4, ux-plan 5.14), only these parts: greeting and Share shop (link, QR, Messenger), the setup checklist until it is done,
 * what needs the owner now, today's four numbers, members, in progress and best sellers today. Every date is Manila;
 * after midnight the numbers reload for the new day.
 */
export default function HomeScreen() {
  const shop = useShop();
  const phone = useFormFactor() === 'phone';
  const { now, date } = useToday();
  const today = useDashboardToday(shop.id);
  const insights = useMemberInsights(shop.id);
  const url = shopUrl(shop.slug);

  // Just after midnight the loaded numbers belong to yesterday: load today's (members "this month" too).
  const staleDay = today.data !== undefined && today.data.businessDate !== date;
  const { refetch: refetchToday } = today;
  const { refetch: refetchInsights } = insights;
  useEffect(() => {
    if (!staleDay) return;
    void refetchToday();
    void refetchInsights();
  }, [staleDay, refetchToday, refetchInsights]);

  const state = today.isPending ? 'loading' : today.isError ? 'error' : 'ready';

  return (
    <PageBody size="wide">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-2xl font-bold tracking-tight">{words.greeting[dayPart(now)]}</h2>
          <p className="text-sm text-muted-foreground">{words.today(formatShortDate(date))}</p>
        </div>
        <ResponsiveDialog>
          <ResponsiveDialogTrigger render={<Button variant="outline" />}>
            <IconQrcode aria-hidden="true" />
            {words.shareShop}
          </ResponsiveDialogTrigger>
          <ResponsiveDialogContent className="sm:max-w-lg">
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>{words.shareShop}</ResponsiveDialogTitle>
            </ResponsiveDialogHeader>
            <div className="px-4 pb-4 sm:p-0">
              <ShareShop
                url={url}
                shopName={shop.name}
                filename={shop.slug}
                words={{ ...shared.share, copy: shared.copy, copied: shared.copied }}
                className="border-0 p-0"
                actions={
                  phone ? (
                    <a href={messengerShareLink(url)} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                      <IconBrandMessenger aria-hidden="true" />
                      {words.messenger}
                    </a>
                  ) : null
                }
              />
            </div>
          </ResponsiveDialogContent>
        </ResponsiveDialog>
      </header>

      <SetupChecklist />

      <QueryState
        state={state}
        skeleton={<TodaySkeleton />}
        empty={{ media: <IconChartBar />, title: words.noOrdersToday }}
        error={{
          title: shared.loadFailed,
          retryLabel: shared.tryAgain,
          onRetry: () => {
            void today.refetch();
          },
        }}
      >
        {today.data ? (
          <div className="flex flex-col gap-4">
            <AttentionChips today={today.data} />
            <TodayStats today={today.data} />
          </div>
        ) : null}
      </QueryState>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <InProgress now={now} noOrdersToday={today.data?.ordersToday === 0} />
        <div className="flex min-w-0 flex-col gap-4">
          <MembersCard />
          <BestSellersToday date={date} />
        </div>
      </div>
    </PageBody>
  );
}
