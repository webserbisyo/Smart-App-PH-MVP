import Link from 'next/link';

import { orderingBlock, WORDS } from '@smartapp/core';
import { Alert, AlertDescription } from '@smartapp/ui/components/alert';
import { IconClock } from '@smartapp/ui/icons';
import { BrandCard } from '@smartapp/ui/patterns/BrandCard';
import { ShopInfoList } from '@smartapp/ui/patterns/ShopInfoList';

import { BestSellers } from '../../features/catalog/BestSellers';
import { CategoryChips } from '../../features/catalog/CategoryChips';
import { HomeRewardCard } from '../../features/home/HomeRewardCard';
import { shopMedia, storefrontOrNotFound } from '../../features/shell/shop';

const words = WORDS.storefront;

/**
 * Shop home page:
 * - Phone: BrandCard -> RewardCard -> Categories -> Best Sellers -> ShopInfoList
 * - Desktop (1024 px+): 8/4 grid: Left = BrandCard, Categories, Best Sellers; Right = RewardCard, ShopInfoList
 */
export default async function ShopHomePage({ params }: { params: Promise<{ shop: string }> }) {
  const storefront = await storefrontOrNotFound((await params).shop);
  const { shop } = storefront;
  const { settings } = shop;
  const now = new Date();
  const block = orderingBlock(storefront, now);
  const media = shopMedia(storefront);
  const logo = settings.logoPath ? media[settings.logoPath] : undefined;
  const base = `/${shop.slug}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:gap-8 items-start">
        {/* Left Column (8 cols on desktop, full on phone) */}
        <div className="flex flex-col gap-6 lg:col-span-8 w-full">
          <BrandCard
            name={shop.name}
            tagline={settings.tagline}
            logoUrl={logo?.thumb ?? null}
          />

          {block && (
            <Alert>
              <IconClock aria-hidden="true" />
              <AlertDescription>{block.alert}</AlertDescription>
            </Alert>
          )}

          {/* Phone RewardCard (shows on phone, hidden on desktop 1024px+) */}
          <div className="lg:hidden">
            <HomeRewardCard />
          </div>

          {storefront.categories.length > 0 && (
            <section aria-labelledby="categories" className="flex flex-col gap-3">
              <h2 id="categories" className="text-lg font-bold tracking-tight">
                {words.home.categories}
              </h2>
              <CategoryChips
                categories={storefront.categories}
                label={words.home.categories}
                hrefBase={`${base}/menu`}
              />
            </section>
          )}

          <BestSellers />

          {/* Phone ShopInfoList (shows on phone, hidden on desktop 1024px+) */}
          <div className="lg:hidden">
            <ShopInfoList
              hours={storefront.hours}
              phone={settings.phone}
              address={settings.address}
              city={settings.city}
              facebookUrl={settings.facebookUrl}
              messengerUsername={settings.messengerUsername}
            />
          </div>
        </div>

        {/* Right Column (4 cols on desktop 1024px+, hidden on phone) */}
        <div className="hidden lg:flex lg:col-span-4 lg:flex-col lg:gap-6 lg:sticky lg:top-20 w-full">
          <HomeRewardCard />
          <ShopInfoList
            hours={storefront.hours}
            phone={settings.phone}
            address={settings.address}
            city={settings.city}
            facebookUrl={settings.facebookUrl}
            messengerUsername={settings.messengerUsername}
          />
        </div>
      </div>

      <footer className="mt-8 pt-6 border-t border-shop-30-foreground/10 flex flex-col items-center gap-2 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} {shop.name} · Powered by Smart App PH</p>
        <Link href={`${base}/privacy`} className="underline underline-offset-4 hover:text-shop-10">
          Data Privacy Notice
        </Link>
      </footer>
    </div>
  );
}
