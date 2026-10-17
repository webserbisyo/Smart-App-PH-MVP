'use client';

import { useState } from 'react';

import type { OrderMessage, Payment } from '@smartapp/core';
import { formatManilaTime, WORDS } from '@smartapp/core';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '#components/responsive-dialog';
import {
  IconCheck,
  IconClock,
  IconExternalLink,
  IconPhoto,
  IconReceipt,
  IconTruckDelivery,
  IconX,
} from '../icons';
import { cn } from '#lib/utils';

export interface OrderThreadWords {
  title?: string;
  empty?: string;
  customer?: string;
  shop?: string;
  system?: string;
  proofSent?: string;
  ref?: (ref: string) => string;
  statusPreparing?: string;
  statusReady?: string;
  statusOutForDelivery?: string;
  statusCompleted?: string;
  statusCancelled?: string;
  paymentApproved?: string;
  paymentRejected?: (reason: string) => string;
  paymentRecorded?: string;
}

export interface OrderThreadProps {
  messages: OrderMessage[];
  payments?: Payment[];
  /** Optional resolver for signed proof photo URLs (e.g. for owner or customer). */
  resolveProofUrl?: (path: string) => string | undefined;
  isOwnerView?: boolean;
  composer?: React.ReactNode;
  words?: OrderThreadWords;
  className?: string;
}

function systemMessageText(body: string | null, words?: OrderThreadWords): string {
  if (!body) return 'Status update';
  const threadWords = words ?? WORDS.order.thread;
  const def = WORDS.order.thread;

  if (body.startsWith('status:')) {
    const status = body.replace('status:', '').trim();
    switch (status) {
      case 'placed':
        return 'Order placed';
      case 'preparing':
        return threadWords.statusPreparing ?? def.statusPreparing;
      case 'ready':
        return threadWords.statusReady ?? def.statusReady;
      case 'out_for_delivery':
        return threadWords.statusOutForDelivery ?? def.statusOutForDelivery;
      case 'completed':
        return threadWords.statusCompleted ?? def.statusCompleted;
      case 'cancelled':
        return threadWords.statusCancelled ?? def.statusCancelled;
      default:
        return `Order status: ${status}`;
    }
  }

  if (body === 'payment_approved') return threadWords.paymentApproved ?? def.paymentApproved;
  if (body === 'payment_recorded') return threadWords.paymentRecorded ?? def.paymentRecorded;
  if (body.startsWith('payment_rejected')) {
    const reason = body.replace('payment_rejected:', '').trim();
    return threadWords.paymentRejected ? threadWords.paymentRejected(reason || 'Proof not accepted') : def.paymentRejected(reason || 'Proof not accepted');
  }

  return body;
}

function SystemIcon({ body }: { body: string | null }) {
  if (!body) return <IconClock className="size-3.5" aria-hidden="true" />;
  if (body.includes('completed') || body.includes('approved') || body.includes('recorded')) {
    return <IconCheck className="size-3.5 text-success" aria-hidden="true" />;
  }
  if (body.includes('cancelled') || body.includes('rejected')) {
    return <IconX className="size-3.5 text-destructive" aria-hidden="true" />;
  }
  if (body.includes('out_for_delivery')) {
    return <IconTruckDelivery className="size-3.5 text-primary" aria-hidden="true" />;
  }
  return <IconClock className="size-3.5 text-muted-foreground" aria-hidden="true" />;
}

export function OrderThread({
  messages,
  payments = [],
  resolveProofUrl,
  isOwnerView = false,
  composer,
  words,
  className,
}: OrderThreadProps) {
  const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null);
  const threadWords = words ?? WORDS.order.thread;

  // Payments map for reference number lookup
  const paymentMap = new Map<string, Payment>(payments.map((p) => [p.id, p]));

  return (
    <section
      aria-labelledby="order-thread-title"
      className={cn(
        'flex flex-col gap-4 rounded-[var(--radius-card,1.25rem)] border border-border/60 bg-shop-30 p-5 shadow-xs',
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border/50 pb-3">
        <h2 id="order-thread-title" className="text-base font-semibold text-foreground">
          {threadWords.title}
        </h2>
        <span className="text-xs text-muted-foreground tabular font-medium">
          {messages.length} {messages.length === 1 ? 'update' : 'updates'}
        </span>
      </div>

      {messages.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">
          {threadWords.empty}
        </p>
      ) : (
        <div className="flex flex-col gap-3 py-1">
          {messages.map((message) => {
            const time = formatManilaTime(message.createdAt);

            // System lines: centered badge/strip
            if (message.sender === 'system' || message.kind === 'status') {
              const text = systemMessageText(message.body, threadWords);
              return (
                <div key={message.id} className="flex flex-col items-center gap-1 my-1">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-2xs">
                    <SystemIcon body={message.body} />
                    <span>{text}</span>
                    <span className="text-[10px] text-muted-foreground/70">· {time}</span>
                  </div>
                </div>
              );
            }

            // Customer or Owner messages
            const isCustomer = message.sender === 'customer';
            const payment = message.paymentId ? paymentMap.get(message.paymentId) : undefined;
            const refNo = payment?.referenceNo;
            const proofUrl = message.attachmentPath && resolveProofUrl ? resolveProofUrl(message.attachmentPath) : undefined;

            return (
              <div
                key={message.id}
                className={cn(
                  'flex flex-col gap-1 max-w-[85%]',
                  isCustomer
                    ? isOwnerView ? 'self-start items-start' : 'self-end items-end'
                    : isOwnerView ? 'self-end items-end' : 'self-start items-start',
                )}
              >
                <span className="text-[10px] font-medium text-muted-foreground px-1">
                  {isCustomer ? threadWords.customer : threadWords.shop} · {time}
                </span>

                <div
                  className={cn(
                    'flex flex-col gap-2 rounded-2xl p-3.5 shadow-2xs text-sm',
                    isCustomer
                      ? isOwnerView
                        ? 'rounded-tl-xs bg-muted/60 text-foreground border border-border/40'
                        : 'rounded-tr-xs bg-primary text-primary-foreground'
                      : isOwnerView
                        ? 'rounded-tr-xs bg-primary text-primary-foreground'
                        : 'rounded-tl-xs bg-muted/60 text-foreground border border-border/40',
                  )}
                >
                  {/* Payment proof attachment */}
                  {message.kind === 'payment_proof' && (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 font-semibold">
                        <IconReceipt className="size-4 shrink-0" aria-hidden="true" />
                        <span>{threadWords.proofSent}</span>
                      </div>

                      {refNo && (
                        <div
                          className={cn(
                            'inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-xs font-bold tracking-wider',
                            isCustomer && !isOwnerView
                              ? 'bg-primary-foreground/20 text-primary-foreground'
                              : 'bg-muted text-foreground border border-border/60',
                          )}
                        >
                          {threadWords.ref ? threadWords.ref(refNo) : WORDS.order.thread.ref(refNo)}
                        </div>
                      )}

                      {message.attachmentPath && (
                        <div className="mt-1">
                          {proofUrl ? (
                            <button
                              type="button"
                              onClick={() => {
                                setZoomedPhoto(proofUrl);
                              }}
                              className="relative overflow-hidden rounded-lg border border-border/40 transition-opacity hover:opacity-90 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <img
                                src={proofUrl}
                                alt="Payment proof attachment"
                                className="max-h-40 w-auto rounded-lg object-cover"
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
                                <IconExternalLink className="size-5 text-white drop-shadow-sm" />
                              </div>
                            </button>
                          ) : (
                            <div className="flex items-center gap-2 rounded-lg bg-black/10 dark:bg-white/10 p-2 text-xs">
                              <IconPhoto className="size-4 shrink-0" />
                              <span className="truncate">Payment screenshot</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Regular text or body */}
                  {message.body && (
                    <p className="whitespace-pre-wrap break-words">{message.body}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Composer slot (e.g. ProofDrop when payment is unpaid) */}
      {composer && <div className="mt-2 pt-2 border-t border-border/40">{composer}</div>}

      {/* Zoom Dialog for photo attachments */}
      <ResponsiveDialog
        open={zoomedPhoto !== null}
        onOpenChange={(open) => {
          if (!open) setZoomedPhoto(null);
        }}
      >
        <ResponsiveDialogContent className="sm:max-w-2xl">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Payment Proof</ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          <div className="px-4 pb-4 sm:px-0">
            {zoomedPhoto && (
              <img
                src={zoomedPhoto}
                alt="Payment proof enlarged"
                className="mx-auto max-h-[75dvh] w-auto max-w-full rounded-lg object-contain"
              />
            )}
          </div>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </section>
  );
}
