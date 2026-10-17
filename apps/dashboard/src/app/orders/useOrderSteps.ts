import { useState } from 'react';

import { toApiError, useAdvanceOrder, useRecordPayment } from '@smartapp/api';
import { errorWords } from '@smartapp/core';
import type { Order, OrderAction } from '@smartapp/core';
import { toast } from '@smartapp/ui/components/sonner';

import { useVocab } from '../shop';
import { stepCall } from './steps';

/** A short buzz on Android when a step is taken (ux-plan 3.5). */
function buzz(): void {
  if ('vibrate' in navigator) navigator.vibrate(10);
}

/**
 * Takes an order's next step: Verify payment opens the order; Mark paid and the status steps save at once
 * (optimistic) and come back with the reason when the database refuses; Out for delivery asks for a tracking link
 * first.
 */
export function useOrderSteps(openOrder: (orderId: string) => void, askTracking = true) {
  const vocab = useVocab();
  const advance = useAdvanceOrder();
  const record = useRecordPayment();
  const [trackingFor, setTrackingFor] = useState<string | null>(null);

  const fail = (error: unknown) => {
    toast.error(errorWords(toApiError(error).code, vocab));
  };

  const run = (action: OrderAction, order: Pick<Order, 'id' | 'fulfillment'>) => {
    const call = stepCall(action, order);
    if (call.kind === 'review') {
      openOrder(order.id);
      return;
    }
    if (call.kind === 'advance' && call.askTracking && askTracking) {
      setTrackingFor(order.id);
      return;
    }
    buzz();
    if (call.kind === 'record') {
      record.mutate({ orderId: order.id, method: call.method }, { onError: fail });
    } else {
      advance.mutate({ orderId: order.id, toStatus: call.toStatus, trackingUrl: null }, { onError: fail });
    }
  };

  const sendOut = (trackingUrl: string | null) => {
    if (trackingFor === null) return;
    buzz();
    advance.mutate({ orderId: trackingFor, toStatus: 'out_for_delivery', trackingUrl }, { onError: fail });
    setTrackingFor(null);
  };

  const pendingId = advance.isPending ? advance.variables.orderId : record.isPending ? record.variables.orderId : null;

  return {
    run,
    /** The order whose step is saving. */
    pendingId,
    /** The order waiting for its tracking link (the dialog is open). */
    trackingFor,
    closeTracking: () => {
      setTrackingFor(null);
    },
    sendOut,
  };
}
