import { Rewards } from '../../../features/members/Rewards';
import { storefrontOrNotFound } from '../../../features/shell/shop';

/** Rewards: member card, stamps, and history for this shop. */
export default async function RewardsPage({ params }: { params: Promise<{ shop: string }> }) {
  await storefrontOrNotFound((await params).shop);
  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6 px-4 py-4 sm:py-6">
      <Rewards />
    </div>
  );
}
