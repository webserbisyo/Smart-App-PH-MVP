import { useLocation } from '@tanstack/react-router';

import { matchModulePath } from '@smartapp/core';
import { PageBody } from '@smartapp/ui/patterns/PageBody';

import { OrderDetail } from '../components/OrderDetail';

/** One order (ux-plan 5.11): customer, lines, payment check, timeline and the next step. */
export default function OrderDetailScreen() {
  const path = useLocation({ select: (location) => location.pathname.replace(/^\/+|\/+$/g, '') });
  const orderId = matchModulePath('orders/$orderId', path)?.orderId ?? '';
  return (
    <PageBody size="form" className="min-h-full">
      <OrderDetail key={orderId} orderId={orderId} />
    </PageBody>
  );
}
