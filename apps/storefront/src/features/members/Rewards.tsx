'use client';

import { stampRuleLine, WORDS } from '@smartapp/core';
import { Alert, AlertDescription } from '@smartapp/ui/components/alert';
import { Button } from '@smartapp/ui/components/button';
import { Skeleton } from '@smartapp/ui/components/skeleton';

import { useShop } from '../shell/ShopProvider';
import { JoinPrompt } from './Account';
import { MemberCard } from './MemberCard';
import { StampHistory } from './StampHistory';
import { useMember } from './use-member';

const words = WORDS.storefront.account;

/**
 * The Rewards page (/[shop]/rewards):
 * Displays the shop's member card, stamp progress, rewards rules, and stamp history.
 * If signed out or not joined, presents the JoinPrompt.
 */
export function Rewards() {
  const { storefront } = useShop();
  const member = useMember();
  const { account, rule } = member;
  const slug = storefront.shop.slug;
  const signedIn = Boolean(member.signedIn);

  if (member.failed) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex flex-col items-start gap-2">
          {WORDS.shared.loadFailed}
          <Button variant="outline" size="sm" onClick={member.retry}>
            {WORDS.shared.tryAgain}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (rule === null) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground">
        <p className="text-base font-semibold">{words.noCard}</p>
        <p className="text-sm">This shop does not have an active rewards program.</p>
      </div>
    );
  }

  if (!signedIn || account === null) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold tracking-tight">Rewards</h1>
        <JoinPrompt signedIn={signedIn} />
      </div>
    );
  }

  if (account === undefined) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Rewards</h1>
        <p className="text-sm text-muted-foreground">{stampRuleLine(rule)}</p>
      </header>

      <MemberCard slug={slug} account={account} rule={rule} />

      <section aria-labelledby="rewards-history" className="flex flex-col gap-3">
        <h2 id="rewards-history" className="text-lg font-semibold">{words.history}</h2>
        <StampHistory account={account} />
      </section>
    </div>
  );
}
