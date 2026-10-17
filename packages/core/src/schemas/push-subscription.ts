import { z } from 'zod';

import { Uuid } from './primitives';

/** Browser Web Push subscription keys. */
export const PushSubscriptionKeys = z.object({
  p256dh: z.string().min(1).max(200),
  auth: z.string().min(1).max(100),
});
export type PushSubscriptionKeys = z.infer<typeof PushSubscriptionKeys>;

/** A Web Push subscription record (table `push_subscriptions`). */
export const PushSubscription = z.object({
  id: Uuid.optional(),
  endpoint: z.url(),
  keys: PushSubscriptionKeys,
});
export type PushSubscription = z.infer<typeof PushSubscription>;

/** Outbox notification message payload. */
export const PushNotificationPayload = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  url: z.string().min(1),
});
export type PushNotificationPayload = z.infer<typeof PushNotificationPayload>;

/** A batch item claimed by the push dispatcher. */
export const ClaimedPushBatchItem = z.object({
  id: Uuid,
  tenantId: Uuid,
  subscription: PushSubscription,
  payload: PushNotificationPayload,
  attempts: z.int().nonnegative(),
});
export type ClaimedPushBatchItem = z.infer<typeof ClaimedPushBatchItem>;
