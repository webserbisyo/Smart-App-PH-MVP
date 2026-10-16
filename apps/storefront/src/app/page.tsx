import Link from 'next/link';

import { buttonVariants } from '@smartapp/ui/components/button';
import { Card, CardContent } from '@smartapp/ui/components/card';
import { IconArrowRight, IconBuildingStore, IconDeviceMobile, IconQrcode, IconSparkles } from '@smartapp/ui/icons';
import { cn } from '@smartapp/ui/lib/utils';

export default function RootPlatformPage() {
  return (
    <main className="min-h-dvh bg-background text-foreground flex flex-col justify-between p-6 max-w-xl mx-auto">
      <div className="flex flex-col gap-8 pt-8">
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-primary font-bold text-sm tracking-wide uppercase">
            <IconSparkles className="size-4" />
            <span>Smart App PH</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Phone-first storefronts for local merchants.
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed">
            The fastest, simplest way for Philippine neighborhood food and retail businesses to take orders online with zero transaction cuts.
          </p>
        </header>

        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="border border-border/60 shadow-xs">
            <CardContent className="p-4 flex flex-col gap-1.5">
              <IconDeviceMobile className="size-5 text-primary" />
              <h2 className="text-sm font-semibold">Phone-First Experience</h2>
              <p className="text-xs text-muted-foreground">
                App-like speed, offline readiness, and floating navigation designed for Filipino shoppers.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-border/60 shadow-xs">
            <CardContent className="p-4 flex flex-col gap-1.5">
              <IconQrcode className="size-5 text-primary" />
              <h2 className="text-sm font-semibold">GCash, Maya & Cash</h2>
              <p className="text-xs text-muted-foreground">
                Direct QR code payments, manual proof verification, and reliable cash on delivery.
              </p>
            </CardContent>
          </Card>
        </div>

        <section aria-label="Demo Shops" className="flex flex-col gap-3">
          <h2 className="text-sm font-bold tracking-tight uppercase text-muted-foreground">
            Explore live demo shops
          </h2>
          <div className="flex flex-col gap-2">
            <Link
              href="/juans-cafe"
              className="flex items-center justify-between rounded-xl border border-border/60 bg-card p-3.5 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 font-bold text-xs">
                  JC
                </div>
                <div>
                  <p className="text-sm font-semibold">Juan&apos;s Cafe</p>
                  <p className="text-xs text-muted-foreground">Artisan coffee and pastries</p>
                </div>
              </div>
              <IconArrowRight className="size-4 text-muted-foreground" />
            </Link>

            <Link
              href="/tala-apparel"
              className="flex items-center justify-between rounded-xl border border-border/60 bg-card p-3.5 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-xs">
                  TA
                </div>
                <div>
                  <p className="text-sm font-semibold">Tala Apparel</p>
                  <p className="text-xs text-muted-foreground">Everyday essentials and linen wear</p>
                </div>
              </div>
              <IconArrowRight className="size-4 text-muted-foreground" />
            </Link>
          </div>
        </section>

        <div className="flex flex-col gap-3 pt-2">
          <a
            href="https://app.webserbisyo.com"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ size: 'lg' }), 'w-full gap-2 text-base font-semibold')}
          >
            <IconBuildingStore className="size-5" />
            Open Merchant Dashboard
          </a>
        </div>
      </div>

      <footer className="pt-12 pb-4 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} Smart App PH · Operated by Webserbisyo</p>
      </footer>
    </main>
  );
}
