'use client';

import { useState } from 'react';

import { formatPeso, WORDS } from '@smartapp/core';
import type { PaymentAccount, TransferMethod } from '@smartapp/core';
import { Dialog, DialogContent, DialogTitle } from '@smartapp/ui/components/dialog';
import { CopyButton } from '@smartapp/ui/patterns/CopyButton';

import { useShop } from '../shell/ShopProvider';

const words = WORDS.storefront.checkout;

/** One account: name, number with Copy, and the QR (tap to enlarge). */
function AccountCard({ account }: { account: PaymentAccount }) {
  const { media } = useShop();
  const [qrOpen, setQrOpen] = useState(false);
  const method = WORDS.order.method[account.method];
  const qr = account.qrPath === null ? undefined : media[account.qrPath];
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-card p-3">
      <dl className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
        <dt className="sr-only">{words.accountName}</dt>
        <dd className="truncate font-semibold">{account.bankName ?? method}</dd>
        <dd className="truncate text-muted-foreground">{account.accountName}</dd>
        <dt className="sr-only">{words.accountNumber}</dt>
        <dd className="flex items-center gap-2">
          <span className="tabular truncate text-base font-semibold">{account.accountNumber}</span>
          <CopyButton value={account.accountNumber} words={WORDS.shared} />
        </dd>
      </dl>
      {qr && (
        <>
          <button
            type="button"
            className="pressable shrink-0 rounded-md border p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`${words.qrAlt(method)}. ${words.enlargeQr}`}
            onClick={() => {
              setQrOpen(true);
            }}
          >
            <img src={qr.thumb} alt="" className="size-16 object-contain" />
          </button>
          <Dialog open={qrOpen} onOpenChange={setQrOpen}>
            <DialogContent>
              <DialogTitle>{words.qrAlt(account.bankName ?? method)}</DialogTitle>
              <img src={qr.full} alt={words.qrAlt(method)} className="mx-auto aspect-square w-full max-w-80 object-contain" />
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}

/** The shop's accounts for a transfer method and "Send exactly ₱345". */
export function TransferAccounts({ method, amount }: { method: TransferMethod; amount: number }) {
  const { storefront } = useShop();
  const accounts = storefront.paymentAccounts.filter((account) => account.method === method && account.isActive);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-base font-bold">{words.sendExactly(formatPeso(amount))}</p>
      {accounts.map((account) => (
        <AccountCard key={account.id} account={account} />
      ))}
    </div>
  );
}
