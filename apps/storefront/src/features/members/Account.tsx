'use client';

import Link from 'next/link';

import { stampRuleLine, WORDS } from '@smartapp/core';
import { Alert, AlertDescription } from '@smartapp/ui/components/alert';
import { Button } from '@smartapp/ui/components/button';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { IconGift, IconMail, IconPhone, IconShieldCheck } from '@smartapp/ui/icons';

import { SignOutButton } from '../account/SignOutButton';
import { InstallCard } from '../install/InstallCard';
import { useShop } from '../shell/ShopProvider';
import { SavedAddresses } from './SavedAddresses';
import { useMember } from './use-member';

const words = WORDS.storefront.account;

/** Signed out, or signed in without joining this shop: what the stamp card is, and Join. */
export function JoinPrompt({ signedIn }: { signedIn: boolean }) {
  const { openJoin } = useShop();
  const { rule, email } = useMember();
  return (
    <section aria-labelledby="account-join" className="flex flex-col gap-3 rounded-[var(--radius-card,1.25rem)] border border-shop-10/20 bg-shop-30 p-5 shadow-xs">
      <h2 id="account-join" className="flex items-center gap-2 text-lg font-semibold">
        <IconGift aria-hidden="true" className="size-5 text-shop-10" />
        {words.joinTitle}
      </h2>
      {rule !== null && <p className="font-medium text-foreground">{stampRuleLine(rule)}</p>}
      <p className="text-sm text-muted-foreground">{signedIn ? words.notMember : rule !== null ? words.joinText : words.noCard}</p>
      {signedIn && email !== null && <p className="text-sm text-muted-foreground">{words.signedInAs(email)}</p>}
      <Button
        size="lg"
        variant="shop"
        onClick={() => {
          openJoin(null);
        }}
      >
        {WORDS.storefront.join.submit}
      </Button>
    </section>
  );
}

/**
 * The account page (P4.6 / SF1 Step 8):
 * Formatted as a grouped list: profile, saved addresses, install, privacy, sign out.
 * Stamps and rewards live on /[shop]/rewards.
 */
export function Account({ serverSignedIn }: { serverSignedIn: boolean }) {
  const { storefront } = useShop();
  const member = useMember();
  const { account } = member;
  const slug = storefront.shop.slug;
  const signedIn = member.signedIn ?? serverSignedIn;

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

  if (!signedIn || account === null) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold tracking-tight">{words.title}</h1>
        <JoinPrompt signedIn={signedIn} />
        <InstallCard buttonVariant="outline" />
        {signedIn && <SignOutButton />}
      </div>
    );
  }

  if (account === undefined) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-28 w-full rounded-[var(--radius-card,1.25rem)]" />
        <Skeleton className="h-40 w-full rounded-[var(--radius-card,1.25rem)]" />
        <Skeleton className="h-20 w-full rounded-[var(--radius-card,1.25rem)]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">{words.title}</h1>

      {/* 1. Profile */}
      <section aria-labelledby="profile-heading" className="flex items-center gap-4 rounded-[var(--radius-card,1.25rem)] border border-border/60 bg-shop-30 p-5 shadow-xs">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-shop-10 text-shop-10-foreground font-bold text-xl shadow-xs">
          {account.customer.name.slice(0, 1).toUpperCase()}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h2 id="profile-heading" className="text-lg font-bold truncate">
              {account.customer.name}
            </h2>
            <span className="rounded-full bg-shop-10-soft px-2 py-0.5 text-xs font-semibold text-shop-10">
              Member
            </span>
          </div>
          <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
            {member.email && (
              <span className="flex items-center gap-1.5 truncate">
                <IconMail className="size-3.5 shrink-0" />
                {member.email}
              </span>
            )}
            {account.customer.phone && (
              <span className="flex items-center gap-1.5">
                <IconPhone className="size-3.5 shrink-0" />
                {account.customer.phone}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* 2. Saved Addresses */}
      <div className="rounded-[var(--radius-card,1.25rem)] border border-border/60 bg-shop-30 p-5 shadow-xs">
        <SavedAddresses slug={slug} account={account} />
      </div>

      {/* 3. Install App */}
      <InstallCard buttonVariant="outline" />

      {/* 4. Privacy Notice */}
      <div className="flex items-center justify-between rounded-[var(--radius-card,1.25rem)] border border-border/60 bg-shop-30 p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <IconShieldCheck className="size-5 text-shop-10" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Data Privacy Notice</span>
            <span className="text-xs text-muted-foreground">How {storefront.shop.name} protects your data</span>
          </div>
        </div>
        <Link
          href={`/${slug}/privacy`}
          className="text-xs font-semibold text-shop-10 underline underline-offset-4 hover:opacity-80"
        >
          Read
        </Link>
      </div>

      {/* 5. Sign Out */}
      <div className="pt-2">
        <SignOutButton />
      </div>
    </div>
  );
}
