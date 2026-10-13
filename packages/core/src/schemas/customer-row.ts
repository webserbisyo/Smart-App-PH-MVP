import { z } from 'zod';

import { Customer } from './customer';

/** A row of the owner's customer list: the customer and their stamp balance (view `customer_stamp_balances`). */
export const CustomerRow = Customer.extend({
  stamps: z.int().nonnegative(),
});
export type CustomerRow = z.infer<typeof CustomerRow>;
