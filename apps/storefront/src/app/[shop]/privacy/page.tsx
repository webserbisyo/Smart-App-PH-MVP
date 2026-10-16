import type { Metadata } from 'next';
import Link from 'next/link';

import { buttonVariants } from '@smartapp/ui/components/button';
import { Card, CardContent } from '@smartapp/ui/components/card';
import { IconChevronLeft, IconMail, IconMapPin, IconPhone, IconShieldCheck } from '@smartapp/ui/icons';
import { cn } from '@smartapp/ui/lib/utils';

import { storefrontOrNotFound } from '../../../features/shell/shop';

interface PrivacyPageProps {
  params: Promise<{ shop: string }>;
}

export async function generateMetadata({ params }: PrivacyPageProps): Promise<Metadata> {
  const { shop } = await storefrontOrNotFound((await params).shop);
  return {
    title: `Privacy Notice · ${shop.name}`,
    description: `How ${shop.name} collects, protects, and handles your customer information.`,
  };
}

export default async function ShopPrivacyPage({ params }: PrivacyPageProps) {
  const { shop } = await storefrontOrNotFound((await params).shop);
  const { settings } = shop;
  const baseHref = `/${shop.slug}`;

  return (
    <article className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-2">
      <div>
        <Link
          href={baseHref}
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-1.5 -ml-2 text-muted-foreground')}
        >
          <IconChevronLeft className="size-4" />
          Back to {shop.name}
        </Link>
      </div>

      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-shop-10 font-bold text-xs uppercase tracking-wide">
          <IconShieldCheck className="size-4" />
          Data Privacy Notice
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Privacy Notice for {shop.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Compliant with the Philippine Data Privacy Act of 2012 (Republic Act No. 10173).
        </p>
      </header>

      {/* Filipino Summary Card */}
      <Card className="border-shop-10/20 bg-shop-10-soft/50 shadow-xs">
        <CardContent className="p-4 flex flex-col gap-2 text-sm leading-relaxed">
          <h2 className="font-bold text-shop-10 flex items-center gap-1.5 text-base">
            Maikling Buod sa Filipino
          </h2>
          <p className="text-shop-30-foreground/90">
            Kinokolekta lamang ng <strong>{shop.name}</strong> ang iyong pangalan, numero ng telepono, tirahan (kung delivery), at patunay ng bayad (kung GCash/Maya transfer) upang maihanda at maipadala ang iyong mga order.
          </p>
          <p className="text-shop-30-foreground/90">
            Hindi namin kailanman ibebenta o ipapamahagi ang iyong impormasyon sa ibang partido. Ang mga litrato ng resibo ay itinatago lamang nang hanggang 30 araw upang masigurado ang tamang beripikasyon ng bayad. Maaari kang humiling ng kopya o pagbura ng iyong datos anumang oras sa pamamagitan ng pakikipag-ugnayan sa tindahan o sa Smart App PH.
          </p>
        </CardContent>
      </Card>

      {/* Full Plain English Sections */}
      <section className="flex flex-col gap-6 text-sm text-foreground/90 leading-relaxed">
        <div className="flex flex-col gap-2">
          <h2 className="text-base font-bold text-foreground">1. Who Keeps Your Data</h2>
          <p>
            Your customer data is collected and managed directly by <strong>{shop.name}</strong> as the Data Controller.
            Smart App PH (operated by Webserbisyo) acts solely as the technical service provider and Data Processor that hosts and powers this digital storefront.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-base font-bold text-foreground">2. What Information We Collect</h2>
          <p>We only collect the minimum details necessary to complete and deliver your purchases:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Full Name:</strong> To address and identify your order.</li>
            <li><strong>Mobile Phone Number:</strong> To contact you about order confirmation, preparation, or delivery coordination.</li>
            <li><strong>Delivery Address and Landmarks (for delivery orders):</strong> To ensure your rider reaches the exact drop-off spot.</li>
            <li><strong>Optional Email Address:</strong> If provided for digital receipts or account login.</li>
            <li><strong>Payment Proofs:</strong> Screenshots or reference numbers uploaded during manual GCash/Maya transfers.</li>
            <li><strong>Order History:</strong> Record of items ordered, totals, fulfillment choice, and order status.</li>
          </ul>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-base font-bold text-foreground">3. Purpose and Legal Basis</h2>
          <p>
            Your information is used strictly to verify your purchase, fulfill preparation and delivery, record stamp loyalty rewards (if joined), and respond to any customer support or refund questions. We do not use your information for spam or marketing without your explicit consent.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-base font-bold text-foreground">4. Data Retention</h2>
          <p>
            Payment proof screenshots and upload records are automatically deleted after <strong>30 days</strong>. Basic order records and transaction receipts are retained in accordance with Philippine accounting and merchant recordkeeping regulations.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-base font-bold text-foreground">5. Your Privacy Rights</h2>
          <p>
            Under the Philippine Data Privacy Act, you have the right to be informed, access your stored data, rectify errors, or request deletion of your contact records.
          </p>
        </div>

        {/* Contact info card */}
        <div className="flex flex-col gap-2 pt-2">
          <h2 className="text-base font-bold text-foreground">6. How to Contact Us</h2>
          <p>
            To exercise your privacy rights, ask a question, or request data deletion, contact {shop.name} directly:
          </p>

          <Card className="border border-border/70 shadow-xs mt-2">
            <CardContent className="p-4 flex flex-col gap-2.5">
              <p className="font-semibold text-foreground">{shop.name}</p>
              {settings.phone && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <IconPhone className="size-4 shrink-0 text-shop-10" />
                  <a href={`tel:${settings.phone}`} className="hover:underline">
                    {settings.phone}
                  </a>
                </div>
              )}
              {settings.address && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <IconMapPin className="size-4 shrink-0 text-shop-10" />
                  <span>{[settings.address, settings.city].filter(Boolean).join(', ')}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <IconMail className="size-4 shrink-0 text-shop-10" />
                <span>
                  Platform support: <a href="mailto:privacy@webserbisyo.com" className="underline">privacy@webserbisyo.com</a>
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </article>
  );
}
