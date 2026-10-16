'use client';

import { useEffect, useState } from 'react';

import { toApiError, uploadPaymentProof, useApiClient, useSubmitPaymentProof } from '@smartapp/api';
import { errorWords, formatManilaTime, WORDS } from '@smartapp/core';
import type { Order, TransferMethod } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { Spinner } from '@smartapp/ui/components/spinner';
import { useOnline } from '@smartapp/ui/hooks/use-online';
import { IMAGE_SIZES } from '@smartapp/ui/lib/compress-image';
import { PhotoField } from '@smartapp/ui/patterns/PhotoField';

import { TransferAccounts } from '../checkout/TransferAccounts';

const words = WORDS.storefront.receipt.upload;

/** The same length rule as submit_payment_proof. */
function referenceOk(reference: string): boolean {
  const length = reference.trim().length;
  return length >= 4 && length <= 40;
}

/**
 * The amber "Upload proof" card on the receipt of a transfer order that is not paid: the shop's account, the
 * screenshot (made smaller on the phone, then stored privately) and the reference number.
 */
export function ProofUpload({ order, method }: { order: Order; method: TransferMethod }) {
  const client = useApiClient();
  const online = useOnline();
  const submit = useSubmitPaymentProof();
  const [proofPath, setProofPath] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [reference, setReference] = useState('');
  const [tried, setTried] = useState(false);
  const [uploading, setUploading] = useState(false);

  // The preview is a local blob URL: free it once it is replaced or the card goes away.
  useEffect(() => {
    if (preview === null) return undefined;
    return () => {
      URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const referenceError = tried && !referenceOk(reference);
  const photoError = tried && proofPath === null;
  const failure = submit.error ? toApiError(submit.error).code : null;

  const send = () => {
    setTried(true);
    if (proofPath === null || !referenceOk(reference)) return;
    submit.mutate({ token: order.token, method, referenceNo: reference.trim(), proofPath });
  };

  return (
    <section aria-labelledby="proof-title" className="flex flex-col gap-4 rounded-xl border border-warning bg-warning-soft p-4">
      <h2 id="proof-title" className="text-lg font-semibold">
        {words.title}
      </h2>
      <TransferAccounts method={method} amount={order.total} />
      {order.expiresAt !== null && <p className="text-sm font-medium">{words.expires(formatManilaTime(order.expiresAt))}</p>}
      <div className="flex flex-col gap-1">
        <PhotoField
          label={words.photo}
          value={preview}
          upload={async (blob) => {
            setUploading(true);
            try {
              const { path } = await uploadPaymentProof(client, { tenantId: order.tenantId, token: order.token }, blob);
              setPreview(URL.createObjectURL(blob));
              return path;
            } finally {
              setUploading(false);
            }
          }}
          onChange={(path) => {
            setProofPath(path);
            if (path === null) setPreview(null);
          }}
          compress={IMAGE_SIZES.proof}
          words={WORDS.shared.photo}
          disabled={!online || submit.isPending}
        />
        {photoError && <FieldError>{words.photoNeeded}</FieldError>}
      </div>
      <Field data-invalid={referenceError || undefined}>
        <FieldLabel htmlFor="reference">{words.reference}</FieldLabel>
        <Input
          id="reference"
          autoComplete="off"
          maxLength={40}
          value={reference}
          aria-invalid={referenceError}
          onChange={(event) => {
            setReference(event.target.value);
          }}
        />
        {referenceError ? <FieldError>{words.referenceInvalid}</FieldError> : <FieldDescription>{words.referenceHint}</FieldDescription>}
      </Field>
      {failure !== null && (
        <p role="alert" className="text-sm font-medium text-destructive-text">
          {errorWords(failure)}
        </p>
      )}
      <Button type="button" size="lg" variant="shop" onClick={send} disabled={!online || uploading || submit.isPending}>
        {!online ? (
          WORDS.shared.offlineShort
        ) : submit.isPending ? (
          <>
            <Spinner />
            {words.sending}
          </>
        ) : (
          words.send
        )}
      </Button>
    </section>
  );
}
