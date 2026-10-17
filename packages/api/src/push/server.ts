import webpush from 'web-push';
import { dbFunctions } from '@smartapp/core';
import type { ClaimedPushBatchItem } from '@smartapp/core';

import type { ApiClient } from '../client';
import { throwIfError } from '../errors';
import { fromJson } from '../rows';

/** Claims a batch of queued push notifications from the outbox using the dispatch secret. */
export async function claimPushBatch(
  client: ApiClient,
  secret: string,
  limit: number = 50,
): Promise<ClaimedPushBatchItem[]> {
  const { data, error } = await client.rpc('claim_push_batch', {
    p_secret: secret,
    p_limit: limit,
  });
  throwIfError(error);
  return fromJson(dbFunctions.claim_push_batch.output, data);
}

/** Completes or fails an outbox push notification; optionally removes unsubscribed endpoints (410 Gone). */
export async function finishPush(
  client: ApiClient,
  secret: string,
  id: string,
  ok: boolean,
  gone: boolean = false,
): Promise<{ ok: boolean }> {
  const { data, error } = await client.rpc('finish_push', {
    p_secret: secret,
    p_id: id,
    p_ok: ok,
    p_gone: gone,
  });
  throwIfError(error);
  return fromJson(dbFunctions.finish_push.output, data);
}

export type PushDispatchResult = {
  id: string;
  ok: boolean;
  gone?: boolean;
};

export type VapidConfig = {
  subject: string;
  publicKey: string;
  privateKey: string;
};

/**
 * Server dispatch worker:
 * Claims queued push notifications and sends them via web-push using VAPID.
 * Never logs keys, secrets, or payloads.
 */
export async function dispatchPushBatch(
  client: ApiClient,
  secret: string,
  vapid: VapidConfig,
  limit: number = 50,
): Promise<PushDispatchResult[]> {
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

  const batch = await claimPushBatch(client, secret, limit);
  const results: PushDispatchResult[] = [];

  for (const item of batch) {
    try {
      await webpush.sendNotification(
        {
          endpoint: item.subscription.endpoint,
          keys: {
            p256dh: item.subscription.keys.p256dh,
            auth: item.subscription.keys.auth,
          },
        },
        JSON.stringify(item.payload),
      );
      await finishPush(client, secret, item.id, true, false);
      results.push({ id: item.id, ok: true });
    } catch (err: unknown) {
      const statusCode =
        err && typeof err === 'object' && 'statusCode' in err && typeof err.statusCode === 'number'
          ? err.statusCode
          : 0;
      const gone = statusCode === 404 || statusCode === 410;
      await finishPush(client, secret, item.id, false, gone);
      results.push({ id: item.id, ok: false, gone });
    }
  }

  return results;
}

export { dispatchPushBatch as dispatchPushBatchStub };
