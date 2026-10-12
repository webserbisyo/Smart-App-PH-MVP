import type { OrderStatus, TimelineStep } from '@smartapp/core';

import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from '#components/reui/timeline';
import { cn } from '#lib/utils';

export interface OrderTimelineProps {
  /** From `timelineSteps(order, events)` in @smartapp/core. */
  steps: readonly TimelineStep[];
  /** `WORDS.order.status`. */
  labels: Readonly<Record<OrderStatus, string>>;
  /** Formats a step's time (`formatManilaTime`). */
  formatTime: (at: string) => string;
  /** Horizontal on the receipt header, vertical in the order detail (UX-6). */
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

/** The order's steps with the time each was reached. A cancelled or expired end step shows in red. */
export function OrderTimeline({ steps, labels, formatTime, orientation = 'vertical', className }: OrderTimelineProps) {
  const current = steps.findIndex((step) => step.state === 'current');
  const reached = current === -1 ? steps.length : current + 1;
  return (
    <Timeline value={reached} orientation={orientation} className={cn(orientation === 'horizontal' && 'overflow-x-auto pt-1', className)}>
      {steps.map((step, index) => {
        const ended = step.status === 'cancelled' || step.status === 'expired';
        return (
          <TimelineItem key={step.status} step={index + 1} className={cn(orientation === 'horizontal' && 'min-w-0 group-data-[orientation=horizontal]/timeline:not-last:pe-2')}>
            <TimelineHeader>
              <TimelineSeparator />
              <TimelineTitle
                className={cn(
                  orientation === 'horizontal' && 'text-xs sm:text-sm',
                  step.state === 'upcoming' && 'text-muted-foreground',
                  ended && 'text-destructive-text',
                )}
              >
                {labels[step.status]}
              </TimelineTitle>
              <TimelineIndicator
                className={cn(
                  step.state === 'current' && !ended && 'border-primary bg-primary',
                  ended && 'border-destructive bg-destructive',
                )}
              />
            </TimelineHeader>
            <TimelineContent>{step.at && <TimelineDate className={cn('tabular mb-0', orientation === 'horizontal' && 'text-[0.6875rem] sm:text-xs')}>{formatTime(step.at)}</TimelineDate>}</TimelineContent>
          </TimelineItem>
        );
      })}
    </Timeline>
  );
}
