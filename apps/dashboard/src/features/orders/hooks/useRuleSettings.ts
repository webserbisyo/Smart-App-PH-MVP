import { useShopSettings } from '@smartapp/api';
import type { RuleSettings } from '@smartapp/core';

import { useShop } from '../../../app/shop';

/** What `nextActions` needs from the shop's settings (pay later at pickup); off until the settings load. */
export function useRuleSettings(): RuleSettings {
  const shop = useShop();
  const settings = useShopSettings(shop.id);
  return { payLaterPickup: settings.data?.payLaterPickup ?? false };
}
