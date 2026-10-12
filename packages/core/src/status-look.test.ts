import { describe, expect, it } from 'vitest';

import { ORDER_STATUSES, PAYMENT_STATUSES } from './schemas/enums';
import { STATUS_ICONS, STATUS_LOOK, TONES, orderStatusLook, paymentLook } from './status-look';

describe('STATUS_LOOK', () => {
  it('gives every order and payment status a tone, an icon and a word', () => {
    const looks = [...ORDER_STATUSES.map(orderStatusLook), ...PAYMENT_STATUSES.map((status) => paymentLook(status, null))];
    for (const look of looks) {
      expect(TONES).toContain(look.tone);
      expect(STATUS_ICONS).toContain(look.icon);
      expect(look.word.length).toBeGreaterThan(0);
    }
  });

  it('keeps one meaning per colour', () => {
    expect(STATUS_LOOK.payment.paid.tone).toBe('success');
    expect(STATUS_LOOK.order.completed.tone).toBe('success');
    expect(STATUS_LOOK.payment.pending.tone).toBe('warning');
    expect(STATUS_LOOK.late.tone).toBe('danger');
    expect(STATUS_LOOK.order.cancelled.tone).toBe('danger');
  });

  it('words unpaid cash on delivery as pay on delivery', () => {
    expect(paymentLook('unpaid', 'cod').word).toBe('Pay on delivery');
    expect(paymentLook('unpaid', 'cash').word).toBe('Unpaid');
    expect(paymentLook('paid', 'cod').word).toBe('Paid');
  });

  it('has no arrows or emoji in the words', () => {
    for (const look of [...Object.values(STATUS_LOOK.order), ...Object.values(STATUS_LOOK.payment)]) {
      expect(look.word).toMatch(/^[\w\s-]+$/);
    }
  });
});
