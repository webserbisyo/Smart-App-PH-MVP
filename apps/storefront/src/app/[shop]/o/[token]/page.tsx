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
  return <Receipt token={token} justPlaced={placed === '1'} />;
}
