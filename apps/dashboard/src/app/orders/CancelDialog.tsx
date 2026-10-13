import { useState } from 'react';

import { toApiError, useCancelOrder } from '@smartapp/api';
import { errorWords, isPaid, ticketNo, WORDS } from '@smartapp/core';
import type { Order } from '@smartapp/core';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@smartapp/ui/components/alert-dialog';
import { Button } from '@smartapp/ui/components/button';
import { Field, FieldError, FieldLabel } from '@smartapp/ui/components/field';
import { Spinner } from '@smartapp/ui/components/spinner';
import { Textarea } from '@smartapp/ui/components/textarea';
import { toast } from '@smartapp/ui/components/sonner';
import { useOnline } from '@smartapp/ui/hooks/use-online';

import { useVocab } from '../shop';

const words = WORDS.dashboard.orders.cancelDialog;

type CancelTarget = Pick<Order, 'id' | 'orderNo' | 'paymentStatus'>;

function CancelForm({ order, onDone }: { order: CancelTarget; onDone: () => void }) {
  const vocab = useVocab();
  const online = useOnline();
  const cancel = useCancelOrder();
  const [reason, setReason] = useState('');
  const [tried, setTried] = useState(false);
  const missing = tried && reason.trim() === '';

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (reason.trim() === '') return;
        cancel.mutate(
          { orderId: order.id, reason: reason.trim() },
          {
            onSuccess: onDone,
            onError: (error) => {
              toast.error(errorWords(toApiError(error).code, vocab));
            },
          },
        );
      }}
    >
      <AlertDialogHeader>
        <AlertDialogTitle>{words.title(ticketNo(order.orderNo))}</AlertDialogTitle>
        <AlertDialogDescription>{words.description}</AlertDialogDescription>
      </AlertDialogHeader>
      {isPaid(order) ? <p className="text-sm font-medium text-warning-soft-foreground">{words.paid}</p> : null}
      <Field data-invalid={missing || undefined}>
        <FieldLabel htmlFor="cancel-reason">{words.reason}</FieldLabel>
        <Textarea
          id="cancel-reason"
          maxLength={200}
          placeholder={words.placeholder}
          value={reason}
          aria-invalid={missing}
          onChange={(event) => {
            setReason(event.target.value);
          }}
        />
        {missing ? <FieldError>{words.required}</FieldError> : null}
      </Field>
      <AlertDialogFooter>
        <AlertDialogCancel type="button">{words.keep}</AlertDialogCancel>
        <Button type="submit" variant="destructive" disabled={!online || cancel.isPending}>
          {cancel.isPending ? <Spinner /> : null}
          {words.confirm}
        </Button>
      </AlertDialogFooter>
    </form>
  );
}

/** Cancel with a reason (required). Stock comes back; the receipt shows Cancelled and the reason. */
export function CancelDialog({ order, onClose }: { order: CancelTarget | null; onClose: () => void }) {
  return (
    <AlertDialog
      open={order !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialogContent>{order ? <CancelForm key={order.id} order={order} onDone={onClose} /> : null}</AlertDialogContent>
    </AlertDialog>
  );
}
