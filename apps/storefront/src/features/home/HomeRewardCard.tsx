'use client';

import { RewardCard } from '@smartapp/ui/patterns/RewardCard';

import { MemberCard } from '../members/MemberCard';
import { useMember } from '../members/use-member';
import { useShop } from '../shell/ShopProvider';

/**
 * Home reward card:
 * Renders the member's active RewardCard if signed in,
 * or the "Join and get 1 free stamp" prompt card if signed out.
 * Hidden if the shop has stamp rewards disabled.
 */
export function HomeRewardCard() {
  const { rule, account, signedIn } = useMember();
  const { storefront, media, openJoin } = useShop();

  if (rule === null) return null;

  const logo = storefront.shop.settings.logoPath ? media[storefront.shop.settings.logoPath] : undefined;

  if (signedIn && account) {
    return <MemberCard slug={storefront.shop.slug} account={account} rule={rule} />;
  }

  return (
    <RewardCard
      stamps={0}
      goal={rule.stampsNeeded}
      reward={rule.rewardLabel}
      logoUrl={logo?.thumb}
      shopName={storefront.shop.name}
      signedIn={false}
      onJoin={() => {
        openJoin(null);
      }}
    />
  );
}
