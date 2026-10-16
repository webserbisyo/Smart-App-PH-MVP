import { Rewards } from '../../../features/members/Rewards';
import { storefrontOrNotFound } from '../../../features/shell/shop';

/** Rewards: member card, stamps, and history for this shop. */
export default async function RewardsPage({ params }: { params: Promise<{ shop: string }> }) {
  await storefrontOrNotFound((await params).shop);
  return <Rewards />;
}
