import { useState } from 'react';

import { toApiError, useProofUrl, useRecordPayment, useReviewPayment } from '@smartapp/api';
import {
  canRecordPayment,
  errorWords,
  formatManilaTime,
  isPaid,
  needsRefund,
  paymentToReview,
  recordMethod,
  rejectionReason,
  ticketNo,
  WORDS,
} from '@smartapp/core';
import type { OrderReceipt, Payment } from '@smartapp/core';
import { Alert, AlertDescription } from '@smartapp/ui/components/alert';
import { Button } from '@smartapp/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@smartapp/ui/components/card';
import { Field, FieldDescription, FieldError, FieldLabel } from '@smartapp/ui/components/field';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@smartapp/ui/components/responsive-dialog';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { Spinner } from '@smartapp/ui/components/spinner';
import { Textarea } from '@smartapp/ui/components/textarea';
import { toast } from '@smartapp/ui/components/sonner';
import { useOnline } from '@smartapp/ui/hooks/use-online';
import { IconAlertTriangle } from '@smartapp/ui/icons';
import { CopyButton } from '@smartapp/ui/patterns/CopyButton';
import { PaymentBadge } from '@smartapp/ui/patterns/StatusBadge';

import { useVocab } from '../../../app/shop';

const words = WORDS.dashboard.orders.detail;
const rejectWords = WORDS.dashboard.orders.reject;

function ProofPhoto({ path, alt }: { path: string; alt: string }) {
  const url = useProofUrl(path);
  const [zoom, setZoom] = useState(false);
  if (url.isPending) return <Skeleton className="aspect-[3/4] w-40 rounded-lg" />;
  if (!url.data) return <p className="text-sm text-destructive-text">{WORDS.shared.loadFailed}</p>;
  return (
    <>
      <button
        type="button"
        className="w-40 overflow-hidden rounded-lg border outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        onClick={() => {
          setZoom(true);
        }}
      >
        <img src={url.data} alt={alt} className="aspect-[3/4] w-full object-cover" />
      </button>
      <p className="text-xs text-muted-foreground">{words.zoom}</p>
      <ResponsiveDialog open={zoom} onOpenChange={setZoom}>
        <ResponsiveDialogContent className="sm:max-w-2xl">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{words.proof}</ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          <div className="px-4 pb-4 sm:px-0">
            <img src={url.data} alt={alt} className="mx-auto max-h-[75dvh] w-auto max-w-full" />
          </div>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
}

function RejectDialog({ payment, open, onOpenChange }: { payment: Payment; open: boolean; onOpenChange: (open: boolean) => void }) {
  const vocab = useVocab();
  const online = useOnline();
  const review = useReviewPayment();
  const [reason, setReason] = useState('');
  const [tried, setTried] = useState(false);
  const length = reason.trim().length;
  const invalid = tried && (length < 3 || length > 200);
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <form
          noValidate
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            setTried(true);
            if (length < 3 || length > 200) return;
            review.mutate(
              { paymentId: payment.id, approve: false, rejectReason: reason.trim() },
              {
                onSuccess: () => {
                  onOpenChange(false);
                },
                onError: (error) => {
                  toast.error(errorWords(toApiError(error).code, vocab));
                },
              },
            );
          }}
        >
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{rejectWords.title}</ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          <div className="px-4 pb-2 sm:px-0">
            <Field data-invalid={invalid || undefined}>
              <FieldLabel htmlFor="reject-reason">{rejectWords.reason}</FieldLabel>
              <Textarea
                id="reject-reason"
                maxLength={200}
                placeholder={rejectWords.placeholder}
                value={reason}
                aria-invalid={invalid}
                onChange={(event) => {
                  setReason(event.target.value);
                }}
              />
              {invalid ? <FieldError>{rejectWords.invalid}</FieldError> : <FieldDescription>{rejectWords.description}</FieldDescription>}
            </Field>
          </div>
          <ResponsiveDialogFooter className="flex-row justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
              }}
            >
              {rejectWords.keep}
            </Button>
            <Button type="submit" variant="destructive" disabled={!online || review.isPending}>
              {review.isPending ? <Spinner /> : null}
              {rejectWords.confirm}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

/**
 * Payment: method and status; for a proof waiting, the photo (tap to zoom), the reference number with Copy, the rule
 * and Approve or Reject; for an unpaid open order, Mark paid (cash, or cash on delivery for delivery).
 */
export function PaymentCard({ receipt, id }: { receipt: OrderReceipt; id?: string }) {
  const { order, payments } = receipt;
  const vocab = useVocab();
  const online = useOnline();
  const review = useReviewPayment();
  const record = useRecordPayment();
  const [rejecting, setRejecting] = useState(false);
  const waiting = paymentToReview(order, payments);
  const rejected = rejectionReason(order, payments);
  const fail = (error: unknown) => {
    toast.error(errorWords(toApiError(error).code, vocab));
  };

  return (
    <Card id={id} size="sm" className="scroll-mt-24">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2">
          <span>{words.payment}</span>
          <span className="flex items-center gap-2 text-sm font-normal">
            {WORDS.order.method[order.paymentMethod]}
            <PaymentBadge status={order.paymentStatus} method={order.paymentMethod} />
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {order.paidAt !== null && isPaid(order) ? (
          <p className="text-sm text-muted-foreground">
            {WORDS.order.payment.paid} · {formatManilaTime(order.paidAt)}
          </p>
        ) : null}

        {waiting ? (
          <>
            {waiting.proofPath !== null ? <ProofPhoto path={waiting.proofPath} alt={words.proofAlt(ticketNo(order.orderNo))} /> : null}
            {waiting.referenceNo !== null ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{words.reference}</p>
                  <p className="tabular truncate text-lg font-semibold">{waiting.referenceNo}</p>
                </div>
                <CopyButton value={waiting.referenceNo} words={{ copy: WORDS.shared.copy, copied: WORDS.shared.copied }} />
              </div>
            ) : null}
            <Alert className="border-warning bg-warning-soft text-warning-soft-foreground">
              <IconAlertTriangle aria-hidden="true" />
              <AlertDescription className="text-warning-soft-foreground">{words.rule}</AlertDescription>
            </Alert>
            <div className="flex flex-wrap gap-2">
              <Button
                size="lg"
                className="flex-1"
                disabled={!online || review.isPending}
                onClick={() => {
                  review.mutate({ paymentId: waiting.id, approve: true, rejectReason: null }, { onError: fail });
                }}
              >
                {review.isPending ? <Spinner /> : null}
                {words.approve}
              </Button>
              <Button
                size="lg"
                variant="outline"
                disabled={!online || review.isPending}
                onClick={() => {
                  setRejecting(true);
                }}
              >
                {words.reject}
              </Button>
            </div>
            <RejectDialog key={waiting.id} payment={waiting} open={rejecting} onOpenChange={setRejecting} />
          </>
        ) : null}

        {rejected !== null ? <p className="text-sm text-destructive-text">{words.rejected(rejected)}</p> : null}

        {canRecordPayment(order) ? (
          <div className="flex flex-col gap-1">
            <Button
              variant="outline"
              disabled={!online || record.isPending}
              onClick={() => {
                record.mutate({ orderId: order.id, method: recordMethod(order) }, { onError: fail });
              }}
            >
              {record.isPending ? <Spinner /> : null}
              {recordMethod(order) === 'cod' ? words.markPaidCod : words.markPaid}
            </Button>
            <p className="text-xs text-muted-foreground">{words.markPaidHint}</p>
          </div>
        ) : null}

        {needsRefund(order) ? <p className="text-sm font-medium">{words.paidRefund}</p> : null}
      </CardContent>
    </Card>
  );
}
