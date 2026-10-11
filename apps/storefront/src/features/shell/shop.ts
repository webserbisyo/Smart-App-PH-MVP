import { notFound } from 'next/navigation';

import { getShopStub } from '@smartapp/api';
import type { ShopStub } from '@smartapp/api';

/** The shop for a `[shop]` route, or Next's not-found page. */
export function shopOrNotFound(slug: string): ShopStub {
  const shop = getShopStub(slug);
  if (!shop) notFound();
  return shop;
}
