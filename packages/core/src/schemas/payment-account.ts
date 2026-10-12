import { z } from 'zod';

import { TransferMethod } from './enums';
import { Uuid } from './primitives';

/** A shop's GCash, Maya or bank account shown at checkout (table `payment_accounts`). */
export const PaymentAccount = z.object({
  id: Uuid,
  tenantId: Uuid,
  method: TransferMethod,
  accountName: z.string().min(1),
  accountNumber: z.string().min(1),
  bankName: z.string().min(1).nullable(),
  qrPath: z.string().min(1).nullable(),
  isActive: z.boolean(),
  sort: z.int(),
});
export type PaymentAccount = z.infer<typeof PaymentAccount>;

/** A payment account as Settings saves it; `id` is null for a new one (it goes to the end of the list). */
export const PaymentAccountDraft = PaymentAccount.omit({ tenantId: true, sort: true }).extend({ id: Uuid.nullable() });
export type PaymentAccountDraft = z.infer<typeof PaymentAccountDraft>;
