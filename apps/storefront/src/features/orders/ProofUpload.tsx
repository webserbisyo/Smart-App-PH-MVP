'use client';

import { toApiError, uploadPaymentProof, useApiClient, useSubmitPaymentProof } from '@smartapp/api';
import { errorWords, formatManilaTime, WORDS } from '@smartapp/core';
import type { Order, TransferMethod } from '@smartapp/core';
import { useOnline } from '@smartapp/ui/hooks/use-online';
import { ProofDrop } from '@smartapp/ui/patterns/ProofDrop';

import { TransferAccounts } from '../checkout/TransferAccounts';

const words = WORDS.storefront.receipt.upload;

/**
 * The amber "Upload proof" section on the receipt of a transfer order that is not paid:
 * the shop's account details, expiration notice, and the ProofDrop pattern (drag-and-drop, camera/gallery,
 * progress, retry, and reference number).
 */
export function ProofUpload({ order, method }: { order: Order; method: TransferMethod }) {
  const client = useApiClient();
  const online = useOnline();
  const submit = useSubmitPaymentProof();
  const failure = submit.error ? toApiError(submit.error).code : null;

  return (
    <div className="flex flex-col gap-4">
      <TransferAccounts method={method} amount={order.total} />
      {order.expiresAt !== null && (
        <p className="text-sm font-medium text-warning-foreground">
          {words.expires(formatManilaTime(order.expiresAt))}
        </p>
      )}
      {failure !== null && (
        <p role="alert" className="text-sm font-medium text-destructive-text">
          {errorWords(failure)}
        </p>
      )}
      <ProofDrop
        upload={async (blob) => {
          const { path } = await uploadPaymentProof(client, { tenantId: order.tenantId, token: order.token }, blob);
          return path;
        }}
        onSubmit={(proofPath, referenceNo) => {
          submit.mutate({ token: order.token, method, referenceNo, proofPath });
        }}
        submitting={submit.isPending}
        disabled={!online}
        words={{
          title: words.title,
          dropHint: 'Drag and drop your screenshot here',
          browseHint: 'or choose a photo from your device',
          referenceLabel: words.reference,
          referenceHint: words.referenceHint,
          referenceInvalid: words.referenceInvalid,
          photoNeeded: words.photoNeeded,
          send: words.send,
          sending: words.sending,
        }}
      />
    </div>
  );
}
