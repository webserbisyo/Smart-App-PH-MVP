'use client';

import { stampRuleLine, WORDS } from '@smartapp/core';
import { Alert, AlertDescription } from '@smartapp/ui/components/alert';
import { Button } from '@smartapp/ui/components/button';
import { ItemGroup } from '@smartapp/ui/components/item';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { IconGift } from '@smartapp/ui/icons';

import { SignOutButton } from '../account/SignOutButton';
import { InstallCard } from '../install/InstallCard';
import { OrderSummaryRow } from '../orders/MyOrders';
import { useShop } from '../shell/ShopProvider';
import { MemberCard } from './MemberCard';
import { SavedAddresses } from './SavedAddresses';
import { StampHistory } from './StampHistory';
import { useMember } from './use-member';

const words = WORDS.storefront.account;
const JOIN_BUTTON = 'bg-member text-member-foreground hover:bg-member-hover';

/** Signed out, or signed in without joining this shop: what the stamp card is, and Join. */
function JoinPrompt({ signedIn }: { signedIn: boolean }) {
  const { openJoin } = useShop();
  const { rule, email } = useMember();
  return (
    <section aria-labelledby="account-join" className="flex flex-col gap-3 rounded-xl border border-member/20 bg-member-soft p-4 text-member-soft-foreground">
      <h2 id="account-join" className="flex items-center gap-2 text-lg font-semibold">
        <IconGift aria-hidden="true" className="size-5" />
        {words.joinTitle}
      </h2>
      {rule !== null && <p className="font-medium">{stampRuleLine(rule)}</p>}
      <p className="text-sm">{signedIn ? words.notMember : rule !== null ? words.joinText : words.noCard}</p>
      {signedIn && email !== null && <p className="text-sm">{words.signedInAs(email)}</p>}
      <Button
        size="lg"
        className={JOIN_BUTTON}
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
 * The account page (P4.6). Signed out: the stamp card explainer and Join. Member: the stamp card (confetti once per
 * reward), stamp history, orders from any device, saved addresses, Sign out. The install card on both.
 * `serverSignedIn` is the server's verified answer, used until the browser's session is read.
 */
export function Account({ serverSignedIn }: { serverSignedIn: boolean }) {
  const { storefront } = useShop();
  const member = useMember();
  const { account, rule } = member;
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
        <h1 className="text-2xl font-semibold">{words.title}</h1>
        <JoinPrompt signedIn={signedIn} />
        <InstallCard />
        {signedIn && <SignOutButton />}
      </div>
    );
  }

  if (account === undefined) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{account.customer.name}</h1>
        {member.email !== null && <p className="text-sm text-muted-foreground">{words.signedInAs(member.email)}</p>}
      </header>

      {rule !== null && (
        <section aria-labelledby="account-stamps" className="flex flex-col gap-3">
          <h2 id="account-stamps" className="sr-only">
            {WORDS.shared.stamps.title}
          </h2>
          <MemberCard slug={slug} account={account} rule={rule} />
          <p className="text-sm text-muted-foreground">{stampRuleLine(rule)}</p>
          <h3 className="font-semibold">{words.history}</h3>
          <StampHistory account={account} />
        </section>
      )}

      <section aria-labelledby="account-orders" className="flex flex-col gap-3">
        <h2 id="account-orders" className="text-lg font-semibold">
          {words.orders}
        </h2>
        {account.orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">{words.ordersEmpty}</p>
        ) : (
          <ItemGroup className="gap-2">
            {account.orders.map((order) => (
              <OrderSummaryRow key={order.id} slug={slug} order={order} />
            ))}
          </ItemGroup>
        )}
      </section>

      <SavedAddresses slug={slug} account={account} />

      <InstallCard />

      <SignOutButton />
    </div>
  );
}
