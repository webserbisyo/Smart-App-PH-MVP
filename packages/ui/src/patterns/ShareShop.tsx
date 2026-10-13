import type { ReactNode } from 'react';

import { IconDownload } from '@tabler/icons-react';

import { Button } from '#components/button';
import { QRCode, QRCodeDownload, QRCodeImage, QRCodeSkeleton } from '#components/qr-code';
import { cn } from '#lib/utils';

import { CopyButton } from './CopyButton';

export interface ShareShopWords {
  title: string;
  text: string;
  copyLink: string;
  downloadQr: string;
  qrAlt: (name: string) => string;
  copy: string;
  copied: string;
}

export interface ShareShopProps {
  /** `https://shop.webserbisyo.com/juans-cafe` */
  url: string;
  shopName: string;
  /** File name for the QR download (the shop's link name). */
  filename: string;
  words: ShareShopWords;
  /** More buttons after Copy and Download (Home: "Share on Messenger" on phones). */
  actions?: ReactNode;
  className?: string;
}

/** The shop link with Copy, and its QR with Download (for the counter), on Home and in Settings. */
export function ShareShop({ url, shopName, filename, words, actions, className }: ShareShopProps) {
  const display = url.replace(/^https?:\/\//, '');
  return (
    <section className={cn('flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-center', className)}>
      <QRCode value={url} size={160} level="M" className="shrink-0 self-center">
        <QRCodeSkeleton className="rounded-md" />
        <QRCodeImage alt={words.qrAlt(shopName)} className="rounded-md border" />
      </QRCode>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div>
          <h3 className="font-semibold">{words.title}</h3>
          <p className="text-sm text-muted-foreground">{words.text}</p>
        </div>
        <p className="truncate rounded-md bg-muted px-3 py-2 font-medium">{display}</p>
        <div className="flex flex-wrap gap-2">
          <CopyButton value={url} label={words.copyLink} words={{ copy: words.copy, copied: words.copied }} />
          <QRCode value={url} size={1024} level="M" className="contents">
            <QRCodeDownload filename={filename} render={<Button variant="outline" size="sm" />}>
              <IconDownload aria-hidden="true" />
              {words.downloadQr}
            </QRCodeDownload>
          </QRCode>
          {actions}
        </div>
      </div>
    </section>
  );
}
