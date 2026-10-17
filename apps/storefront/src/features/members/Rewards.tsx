'use client';

import { useClaimReward, useMyClaims } from '@smartapp/api';
import { stampRuleLine, WORDS } from '@smartapp/core';
import { Alert, AlertDescription } from '@smartapp/ui/components/alert';
import { Button } from '@smartapp/ui/components/button';
import { QRCode, QRCodeImage, QRCodeSkeleton } from '@smartapp/ui/components/qr-code';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { IconGift, IconSparkles } from '@smartapp/ui/icons';

import { useShop } from '../shell/ShopProvider';
import { JoinPrompt } from './Account';
import { MemberCard } from './MemberCard';
import { StampHistory } from './StampHistory';
import { useMember } from './use-member';

const words = WORDS.storefront.account;
const stampWords = WORDS.storefront.stamps;

/**
 * The Rewards page (/[shop]/rewards):
 * Displays the shop's member card, stamp progress, rewards rules, custom prize claims, and stamp history.
 * If signed out or not joined, presents the JoinPrompt.
 */
export function Rewards() {
  const { storefront, media } = useShop();
  const member = useMember();
  const { account, rule } = member;
  const slug = storefront.shop.slug;
  const signedIn = Boolean(member.signedIn);

  const claim = useClaimReward(slug);
  const myClaims = useMyClaims(storefront.shop.id);

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

  const isCustomReward = rule.rewardKind === 'custom';
  const rewardMedia = rule.rewardImagePath ? media[rule.rewardImagePath] : undefined;
  const rewardImageUrl = rewardMedia?.thumb ?? rewardMedia?.full ?? null;

  // Active claim from account (openClaim is pending) or from claims query
  const pendingClaim =
    account.openClaim ?? (myClaims.data ? myClaims.data.find((c) => c.status === 'pending') ?? null : null);
  const latestGivenClaim = myClaims.data ? myClaims.data.find((c) => c.status === 'given') ?? null : null;
  const canClaimPrize = isCustomReward && pendingClaim === null && account.stamps >= rule.stampsNeeded;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Rewards</h1>
        <p className="text-sm text-muted-foreground">{stampRuleLine(rule)}</p>
      </header>

      <MemberCard slug={slug} account={account} rule={rule} />

      {isCustomReward && pendingClaim !== null && (
        <section
          aria-labelledby="prize-claim"
          className="flex flex-col items-center gap-4 rounded-[var(--radius-card,1.25rem)] border border-member/30 bg-member-soft p-6 text-center text-member-soft-foreground shadow-xs"
        >
          <div className="flex flex-col items-center gap-1">
            <span className="rounded-full bg-member/15 px-3 py-1 text-xs font-semibold text-member uppercase tracking-wider">
              {stampWords.claimTitle}
            </span>
            <h2 id="prize-claim" className="text-xl font-bold text-foreground">
              {rule.rewardTitle ?? rule.rewardLabel}
            </h2>
            {rule.rewardDescription && (
              <p className="text-sm text-muted-foreground max-w-sm">{rule.rewardDescription}</p>
            )}
          </div>

          {rewardImageUrl && (
            <img
              src={rewardImageUrl}
              alt={rule.rewardTitle ?? rule.rewardLabel}
              className="size-24 rounded-xl object-cover border border-border shadow-xs"
            />
          )}

          <div className="flex flex-col items-center gap-3 rounded-2xl bg-background p-4 border border-border shadow-xs">
            <QRCode value={pendingClaim.code} size={160} level="M" className="shrink-0 self-center">
              <QRCodeSkeleton className="rounded-md" />
              <QRCodeImage alt={`Claim code ${pendingClaim.code}`} className="rounded-md border" />
            </QRCode>
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Claim Code</span>
              <span className="font-mono text-3xl font-extrabold tracking-widest text-primary">
                {pendingClaim.code}
              </span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground max-w-xs">{stampWords.claimPendingHint}</p>
        </section>
      )}

      {isCustomReward && pendingClaim === null && latestGivenClaim !== null && (
        <section
          aria-labelledby="prize-given"
          className="flex flex-col items-center gap-3 rounded-[var(--radius-card,1.25rem)] border border-emerald-500/30 bg-emerald-500/10 p-5 text-center shadow-xs"
        >
          <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <IconSparkles className="size-5" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <h2 id="prize-given" className="text-lg font-bold text-foreground">
              {stampWords.claimGivenTitle}
            </h2>
            <p className="text-sm text-muted-foreground">{stampWords.claimGivenText}</p>
          </div>
        </section>
      )}

      {canClaimPrize && (
        <section
          aria-labelledby="prize-available"
          className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-[var(--radius-card,1.25rem)] border border-member/30 bg-member-soft p-5 shadow-xs"
        >
          <div className="flex items-center gap-3">
            {rewardImageUrl && (
              <img
                src={rewardImageUrl}
                alt={rule.rewardTitle ?? rule.rewardLabel}
                className="size-14 rounded-xl object-cover border border-border shadow-xs shrink-0"
              />
            )}
            <div className="flex flex-col gap-0.5 text-left">
              <span className="text-xs font-semibold text-member uppercase tracking-wider">Reward Ready</span>
              <h2 id="prize-available" className="text-base font-bold text-foreground">
                {rule.rewardTitle ?? rule.rewardLabel}
              </h2>
              {rule.rewardDescription && (
                <p className="text-xs text-muted-foreground">{rule.rewardDescription}</p>
              )}
            </div>
          </div>
          <Button
            size="lg"
            variant="shop"
            disabled={claim.isPending}
            onClick={() => {
              void claim.mutateAsync();
            }}
            className="w-full sm:w-auto shrink-0 font-bold"
          >
            <IconGift aria-hidden="true" className="mr-1.5 size-4" />
            {claim.isPending ? stampWords.claiming : stampWords.claimPrize}
          </Button>
        </section>
      )}

      <section
        aria-labelledby="rewards-history"
        className="flex flex-col gap-3 rounded-[var(--radius-card,1.25rem)] border border-border/60 bg-shop-30 p-5 shadow-xs"
      >
        <h2 id="rewards-history" className="text-lg font-semibold">
          {words.history}
        </h2>
        <StampHistory account={account} />
      </section>
    </div>
  );
}
