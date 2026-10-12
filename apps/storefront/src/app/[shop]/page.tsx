import Image from 'next/image';
import Link from 'next/link';

import { openState, openStateText, orderingBlock, WORDS } from '@smartapp/core';
import { Alert, AlertDescription } from '@smartapp/ui/components/alert';
import { buttonVariants } from '@smartapp/ui/components/button';
import { IconBrandMessenger, IconClock, IconUsers } from '@smartapp/ui/icons';
import { cn } from '@smartapp/ui/lib/utils';
import { ShopHeader } from '@smartapp/ui/patterns/ShopHeader';

import { BestSellers } from '../../features/catalog/BestSellers';
import { CategoryChips } from '../../features/catalog/CategoryChips';
import { shopMedia, storefrontOrNotFound } from '../../features/shell/shop';

const words = WORDS.storefront;

/** The shop's home: header with open or closed, cover, members line, categories, best sellers, Messenger. */
export default async function ShopHomePage({ params }: { params: Promise<{ shop: string }> }) {
  const storefront = await storefrontOrNotFound((await params).shop);
  const { shop } = storefront;
  const { settings } = shop;
  const now = new Date();
  const block = orderingBlock(storefront, now);
  const media = shopMedia(storefront);
  const statusText = block?.short === words.status.pausedShort ? block.short : openStateText(openState(storefront.hours, storefront.closures, now), now);
  const cover = settings.coverPath ? media[settings.coverPath] : undefined;
  const logo = settings.logoPath ? media[settings.logoPath] : undefined;
  const base = `/${shop.slug}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="-mx-4 -mt-4 flex flex-col gap-4 bg-shop-30 px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-4 text-shop-30-foreground lg:mx-0 lg:mt-0 lg:rounded-2xl lg:p-6">
        <ShopHeader name={shop.name} logoUrl={logo?.thumb ?? null} tagline={settings.tagline} status={{ open: storefront.isOpen, text: statusText }} />
        {cover && (
          <div className="relative aspect-video w-full overflow-hidden rounded-xl">
            <Image src={cover.full} alt="" fill priority sizes="(min-width: 1280px) 1216px, (min-width: 1024px) calc(100vw - 4rem), calc(100vw - 2rem)" className="object-cover" />
          </div>
        )}
      </div>

      {block && (
        <Alert>
          <IconClock aria-hidden="true" />
          <AlertDescription>{block.alert}</AlertDescription>
        </Alert>
      )}

      {storefront.memberCount !== null && (
        <Link href={`${base}/account`} className="pressable flex items-center gap-2 self-start rounded-full text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <IconUsers aria-hidden="true" className="size-4" />
          <span>
            {words.home.members(storefront.memberCount)} · <span className="underline underline-offset-4">{words.home.join}</span>
          </span>
        </Link>
      )}

      {storefront.categories.length > 0 && (
        <section aria-labelledby="categories" className="flex flex-col gap-3">
          <h2 id="categories" className="text-lg font-semibold">
            {words.home.categories}
          </h2>
          <CategoryChips categories={storefront.categories} label={words.home.categories} hrefBase={`${base}/menu`} />
        </section>
      )}

      <BestSellers />

      {settings.messengerUsername && (
        <a
          href={`https://m.me/${encodeURIComponent(settings.messengerUsername)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'self-start')}
        >
          <IconBrandMessenger aria-hidden="true" />
          {words.home.messenger}
        </a>
      )}
    </div>
  );
}
