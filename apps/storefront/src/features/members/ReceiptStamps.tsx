'use client';

import Link from 'next/link';

import { isOpen, orderEarnsStamp, stampLine, stampRuleLine, WORDS } from '@smartapp/core';
import type { Order } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { IconGift } from '@smartapp/ui/icons';

import { useShop } from '../shell/ShopProvider';
import { useMember } from './use-member';

const words = WORDS.storefront.stamps;
const MEMBER_CARD = 'flex flex-col gap-3 rounded-xl border border-member/20 bg-member-soft p-4 text-member-soft-foreground print:hidden';

/**
 * The receipt's stamp card (P4.6). Guests: "Join to earn stamps · this order counts" with Join, which links this
 * order. Members: "+1 stamp when completed" and how many orders are left. Nothing when the stamp card is off.
 */
export function ReceiptStamps({ order }: { order: Order }) {
  const { storefront, openJoin } = useShop();
  const { signedIn, account, rule, progress } = useMember();
  if (rule === null || signedIn === undefined || (signedIn && account === undefined)) return null;
  const earns = orderEarnsStamp(order, rule);
  const pending = earns && isOpen(order);

  if (account) {
    return (
      <Link href={`/${storefront.shop.slug}/account`} className={`${MEMBER_CARD} pressable outline-none focus-visible:ring-2 focus-visible:ring-ring`}>
        <span className="flex items-center gap-2 font-semibold">
          <IconGift aria-hidden="true" className="size-5" />
          {pending ? words.plusOne : WORDS.shared.stamps.title}
        </span>
        {progress && <span className="text-sm">{stampLine(progress, rule.rewardLabel)}</span>}
      </Link>
    );
  }

  return (
    <section aria-labelledby="receipt-join" className={MEMBER_CARD}>
      <div className="flex items-start gap-2">
        <IconGift aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <div className="flex flex-col gap-0.5">
          <h2 id="receipt-join" className="font-semibold">
            {earns ? words.joinThisOrder : words.join}
          </h2>
          <p className="text-sm">{stampRuleLine(rule)}</p>
          <p className="text-sm">{WORDS.storefront.join.free}</p>
        </div>
      </div>
      <Button
        className="bg-member text-member-foreground hover:bg-member-hover"
        onClick={() => {
          openJoin({ orderToken: order.token, pending });
        }}
      >
        {WORDS.storefront.join.submit}
      </Button>
    </section>
  );
}
