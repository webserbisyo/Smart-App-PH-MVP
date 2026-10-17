import { dbFunctions } from '@smartapp/core';
import type { ClaimedPushBatchItem } from '@smartapp/core';

import type { ApiClient } from '../client';
import { throwIfError } from '../errors';
import { fromJson } from '../rows';

// Server-only push dispatcher helper stub for SF3.
// Does not import web-push yet; provides typed claims and completions against the database functions.

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

/**
 * Stub dispatch worker for SF3:
 * In SF3, this will decrypt the push payload and send it via web-push.
 */
export async function dispatchPushBatchStub(
  client: ApiClient,
  secret: string,
  limit: number = 50,
): Promise<PushDispatchResult[]> {
  const batch = await claimPushBatch(client, secret, limit);
  // Stub: in SF2, no web-push dependency is installed.
  return batch.map((item) => ({ id: item.id, ok: true }));
}
