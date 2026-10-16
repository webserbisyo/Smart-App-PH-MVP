import { Receipt } from '../../../../features/orders/Receipt';
import { storefrontOrNotFound } from '../../../../features/shell/shop';

interface ReceiptParams {
  params: Promise<{ shop: string; token: string }>;
  searchParams: Promise<{ placed?: string | string[] }>;
}

/** The receipt: anyone with the link sees the order and its live status. `?placed=1` right after checkout. */
export default async function ReceiptPage({ params, searchParams }: ReceiptParams) {
  const { shop, token } = await params;
  await storefrontOrNotFound(shop);
  const { placed } = await searchParams;
  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6 px-4 py-4 sm:py-6">
      <Receipt token={token} justPlaced={placed === '1'} />
    </div>
  );
}
