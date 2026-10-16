'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { buttonVariants } from '@smartapp/ui/components/button';
import { IconBuildingStore, IconSearch } from '@smartapp/ui/icons';
import { cn } from '@smartapp/ui/lib/utils';

export default function ShopNotFound() {
  const pathname = usePathname();
  // Extract shop slug from pathname (e.g. /juans-cafe/xyz -> juans-cafe)
  const segments = pathname.split('/').filter(Boolean);
  const shopSlug = segments[0] ?? '';
  const baseHref = shopSlug ? `/${shopSlug}` : '/';

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="flex max-w-sm flex-col items-center gap-4">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-shop-10-soft text-shop-10">
          <IconSearch className="size-7 stroke-[1.5]" />
        </div>

        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-bold tracking-tight">Page not found</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We couldn&apos;t find the item or page you&apos;re looking for in this shop.
          </p>
        </div>

        <div className="flex flex-col gap-2 w-full pt-2">
          <Link href={baseHref} className={cn(buttonVariants({ variant: 'shop' }), 'w-full gap-2')}>
            <IconBuildingStore className="size-4" />
            Back to Shop Home
          </Link>
          <Link href={`${baseHref}/menu`} className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}>
            Browse Catalog
          </Link>
        </div>
      </div>
    </div>
  );
}
