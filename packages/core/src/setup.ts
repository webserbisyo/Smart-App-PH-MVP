import { allowedPaymentMethods, availableFulfillments } from './checkout';
import type { DeliveryZone } from './schemas/delivery-zone';
import type { PaymentAccount } from './schemas/payment-account';
import type { ShopSettings } from './schemas/shop';

// The setup checklist on Home (paper 6.1, ux-plan 5.14): five things a new shop needs before it shares its link.

export const SETUP_STEPS = ['logo', 'hours', 'payment', 'product', 'orderTypes'] as const;
export type SetupStep = (typeof SETUP_STEPS)[number];

export interface SetupInput {
  settings: Pick<
    ShopSettings,
    | 'logoPath'
    | 'walkInEnabled'
    | 'pickupEnabled'
    | 'deliveryEnabled'
    | 'codEnabled'
    | 'payLaterPickup'
    | 'deliveryFeeViaMessenger'
  >;
  /** The shop's weekly hours (a new shop starts with every day 08:00 to 20:00). */
  hourCount: number;
  accounts: readonly PaymentAccount[];
  /** Items that are not archived. */
  itemCount: number;
  zones: readonly Pick<DeliveryZone, 'isActive'>[];
}

export interface SetupChecklist {
  steps: { step: SetupStep; done: boolean }[];
  done: number;
  total: number;
  /** All five done: Home hides the checklist. */
  complete: boolean;
}

/**
 * Order types are set when at least one is on and a customer can finish every one that is on: each has a way to pay
 * (the same rule as checkout), and delivery has an active zone or a fee confirmed on Messenger (decision P4-37).
 */
export function orderTypesReady(input: Pick<SetupInput, 'settings' | 'accounts' | 'zones'>): boolean {
  const types = availableFulfillments(input.settings);
  if (types.length === 0) return false;
  return types.every((fulfillment) => {
    if (allowedPaymentMethods(fulfillment, input.settings, input.accounts).length === 0) return false;
    if (fulfillment !== 'delivery') return true;
    return input.settings.deliveryFeeViaMessenger || input.zones.some((zone) => zone.isActive);
  });
}

/** Which of the five setup steps are done, in the checklist's order. */
export function setupChecklist(input: SetupInput): SetupChecklist {
  const done: Record<SetupStep, boolean> = {
    logo: input.settings.logoPath !== null,
    hours: input.hourCount > 0,
    payment: input.accounts.some((account) => account.isActive),
    product: input.itemCount > 0,
    orderTypes: orderTypesReady(input),
  };
  const steps = SETUP_STEPS.map((step) => ({ step, done: done[step] }));
  const count = steps.filter((entry) => entry.done).length;
  return { steps, done: count, total: steps.length, complete: count === steps.length };
}
