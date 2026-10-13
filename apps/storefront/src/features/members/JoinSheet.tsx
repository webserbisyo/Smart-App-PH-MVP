'use client';

import { useState } from 'react';

import { toApiError, useJoinAsMember, useMyOrderTokens } from '@smartapp/api';
import { errorWords, stampRuleLine, WORDS } from '@smartapp/core';
import { Alert, AlertDescription } from '@smartapp/ui/components/alert';
import { Button } from '@smartapp/ui/components/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@smartapp/ui/components/responsive-dialog';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { Spinner } from '@smartapp/ui/components/spinner';
import { IconCircleCheckFilled } from '@smartapp/ui/icons';
import { PhoneField } from '@smartapp/ui/patterns/PhoneField';

import { AccountSignIn } from '../account/AccountSignIn';
import { readRemembered } from '../checkout/remember-me';
import { useShop } from '../shell/ShopProvider';
import { MemberCard } from './MemberCard';
import { StampHistory } from './StampHistory';
import { useMember } from './use-member';

const words = WORDS.storefront.join;
const SHOP_BUTTON = 'bg-shop-10 text-shop-10-foreground hover:bg-shop-10/90 active:bg-shop-10/80';

/** Where the sheet was opened from: a receipt passes its order, so that order links and counts. */
export interface JoinFrom {
  orderToken: string;
  /** The order still earns its stamp (open, from the minimum): "This order counts once it is completed". */
  pending: boolean;
}

/** Name and mobile, then join_as_member with a receipt token from this phone (what links earlier guest orders). */
function JoinDetails({ from }: { from: JoinFrom | null }) {
  const { storefront } = useShop();
  const slug = storefront.shop.slug;
  const tokens = useMyOrderTokens(slug);
  const join = useJoinAsMember();
  const [remembered] = useState(() => readRemembered(slug));
  const [name, setName] = useState(remembered?.name ?? '');
  const [phone, setPhone] = useState<string | null>(remembered?.phone ?? null);
  const [tried, setTried] = useState(false);
  const code = join.error ? toApiError(join.error).code : null;
  const nameMissing = name.trim() === '';

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (nameMissing || phone === null) return;
        join.mutate({ slug, name: name.trim(), phone, orderToken: from?.orderToken ?? tokens[0] ?? null });
      }}
    >
      <FieldGroup>
        <p className="text-sm text-muted-foreground">{words.detailsHint}</p>
        <Field data-invalid={(tried && nameMissing) || undefined}>
          <FieldLabel htmlFor="join-name">{words.name}</FieldLabel>
          <Input
            id="join-name"
            autoComplete="name"
            maxLength={80}
            value={name}
            aria-invalid={tried && nameMissing}
            onChange={(event) => {
              setName(event.target.value);
            }}
          />
          {tried && nameMissing ? <FieldError>{WORDS.storefront.checkout.required.name}</FieldError> : null}
        </Field>
        <div className="flex flex-col gap-2">
          <PhoneField label={words.phone} name="join-phone" value={phone} onChange={setPhone} words={WORDS.shared} required />
          {tried && phone === null ? <FieldError>{WORDS.shared.phoneInvalid}</FieldError> : null}
        </div>
        {code !== null && (
          <Alert variant="destructive">
            <AlertDescription>{code === 'phone_needs_order' ? words.needsOrder : errorWords(code)}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" size="lg" className={SHOP_BUTTON} disabled={join.isPending}>
          {join.isPending ? (
            <>
              <Spinner />
              {words.joining}
            </>
          ) : (
            words.submit
          )}
        </Button>
      </FieldGroup>
    </form>
  );
}

/**
 * The join sheet (P4.6), opened from the receipt, the account page and the cart: the shop's rule and "first stamp
 * free", the email code when signed out, then name and mobile. A member who opens it again just sees their card.
 */
export function JoinSheet({ open, onOpenChange, from }: { open: boolean; onOpenChange: (open: boolean) => void; from: JoinFrom | null }) {
  const { storefront } = useShop();
  const member = useMember();
  const { account, rule } = member;
  const slug = storefront.shop.slug;
  const joined = account !== null && account !== undefined;

  let body;
  if (member.failed) {
    body = (
      <Alert variant="destructive">
        <AlertDescription className="flex flex-col items-start gap-2">
          {WORDS.shared.loadFailed}
          <Button variant="outline" size="sm" onClick={member.retry}>
            {WORDS.shared.tryAgain}
          </Button>
        </AlertDescription>
      </Alert>
    );
  } else if (member.signedIn === false) {
    // Signing in resets the queries, so the sheet moves on to the details by itself.
    body = <AccountSignIn onSignedIn={() => undefined} />;
  } else if (member.signedIn === undefined || account === undefined) {
    body = <Skeleton className="h-48 w-full" />;
  } else if (account === null) {
    body = <JoinDetails from={from} />;
  } else {
    body = (
      <div className="flex flex-col gap-4">
        {rule !== null && <MemberCard slug={slug} account={account} rule={rule} />}
        {from?.pending && rule !== null && <p className="text-sm font-medium">{WORDS.storefront.stamps.counted}</p>}
        {rule !== null && <StampHistory account={account} />}
        <Button
          size="lg"
          className={SHOP_BUTTON}
          onClick={() => {
            onOpenChange(false);
          }}
        >
          {words.close}
        </Button>
      </div>
    );
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-h-[92dvh] gap-4 overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:max-w-md">
        <ResponsiveDialogHeader className="px-0 text-left">
          {joined ? (
            <ResponsiveDialogTitle className="flex items-center gap-2">
              <IconCircleCheckFilled aria-hidden="true" className="size-6 text-member" />
              {words.done}
            </ResponsiveDialogTitle>
          ) : (
            <ResponsiveDialogTitle>{words.title}</ResponsiveDialogTitle>
          )}
          {!joined && (
            <ResponsiveDialogDescription className="flex flex-col gap-1">
              {rule !== null && <span className="font-medium text-foreground">{stampRuleLine(rule)}</span>}
              {rule !== null && <span>{words.free}</span>}
            </ResponsiveDialogDescription>
          )}
        </ResponsiveDialogHeader>
        {member.signedIn && !joined && account === null ? (
          <FieldDescription>{WORDS.storefront.account.signedInAs(member.email ?? '')}</FieldDescription>
        ) : null}
        {body}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
