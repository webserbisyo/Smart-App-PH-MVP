import { describe, expect, it } from 'vitest';

import { stepCall } from './steps';

describe('stepCall', () => {
  it('turns each next step into its database call', () => {
    expect(stepCall('verify_payment', { fulfillment: 'pickup' })).toEqual({ kind: 'review' });
    expect(stepCall('mark_paid', { fulfillment: 'walk_in' })).toEqual({ kind: 'record', method: 'cash' });
    expect(stepCall('mark_paid', { fulfillment: 'delivery' })).toEqual({ kind: 'record', method: 'cod' });
    expect(stepCall('start', { fulfillment: 'walk_in' })).toEqual({ kind: 'advance', toStatus: 'preparing', askTracking: false });
    expect(stepCall('mark_ready', { fulfillment: 'pickup' })).toEqual({ kind: 'advance', toStatus: 'ready', askTracking: false });
    expect(stepCall('out_for_delivery', { fulfillment: 'delivery' })).toEqual({ kind: 'advance', toStatus: 'out_for_delivery', askTracking: true });
    expect(stepCall('complete', { fulfillment: 'walk_in' })).toEqual({ kind: 'advance', toStatus: 'completed', askTracking: false });
  });
});

// Home and the board share these files: like the orders feature, none of them compares an order status itself.
const SOURCES = import.meta.glob<string>(['./*.ts', './*.tsx', '!./*.test.ts'], { query: '?raw', import: 'default', eager: true });

describe('no status logic in the shared order steps', () => {
  it('reads every source file', () => {
    expect(Object.keys(SOURCES)).toEqual(expect.arrayContaining(['./steps.ts', './BoardCard.tsx', './useOrderSteps.ts']));
  });

  it.each(Object.entries(SOURCES))('%s compares no status', (_path, source) => {
    expect(source).not.toMatch(/[sS]tatus\s*(===|!==|==|!=)/);
    expect(source).not.toMatch(/(===|!==)\s*'(placed|preparing|completed|cancelled|expired|unpaid|pending)'/);
    expect(source).not.toMatch(/case\s+'(placed|preparing|ready|out_for_delivery|completed|cancelled|expired)'/);
  });
});
