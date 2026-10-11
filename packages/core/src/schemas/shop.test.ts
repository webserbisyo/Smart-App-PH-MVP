import { describe, expect, it } from 'vitest';

import { shop, shopSettings, tenant } from '../test/samples';

import { Shop, ShopSettings, Tenant } from './shop';

describe('shop', () => {
  it('a valid Tenant parses', () => {
    expect(Tenant.parse(tenant)).toEqual(tenant);
  });
  it('a valid ShopSettings parses', () => {
    expect(ShopSettings.parse(shopSettings)).toEqual(shopSettings);
  });
  it('a valid Shop parses', () => {
    expect(Shop.parse(shop)).toEqual(shop);
  });
  it('rejects a business type outside the list', () => {
    expect(Tenant.safeParse({ ...tenant, businessType: 'services' }).success).toBe(false);
  });
  it('rejects a colour that is not #RRGGBB', () => {
    expect(ShopSettings.safeParse({ ...shopSettings, colorAccent: 'blue' }).success).toBe(false);
  });
});
