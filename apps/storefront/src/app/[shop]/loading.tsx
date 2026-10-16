import { Skeleton } from '@smartapp/ui/components/skeleton';

export default function ShopLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse" aria-busy="true" aria-label="Loading shop content">
      {/* Brand card skeleton */}
      <div className="-mx-4 -mt-4 flex flex-col gap-4 bg-shop-30/40 p-4 lg:mx-0 lg:mt-0 lg:rounded-2xl lg:p-6">
        <div className="flex items-center gap-3">
          <Skeleton className="size-12 rounded-full shrink-0" />
          <div className="flex flex-col gap-2 flex-1">
            <Skeleton className="h-5 w-40 rounded-md" />
            <Skeleton className="h-3 w-56 rounded-md" />
          </div>
        </div>
        <Skeleton className="aspect-video w-full rounded-xl" />
      </div>

      {/* Category chips rail skeleton */}
      <div className="flex items-center gap-2 overflow-x-hidden py-1">
        <Skeleton className="h-9 w-20 rounded-full shrink-0" />
        <Skeleton className="h-9 w-24 rounded-full shrink-0" />
        <Skeleton className="h-9 w-28 rounded-full shrink-0" />
        <Skeleton className="h-9 w-20 rounded-full shrink-0" />
      </div>

      {/* Product cards grid skeleton */}
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-32 rounded-md" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-2xl border border-shop-30-foreground/10 bg-card p-3 shadow-xs">
              <Skeleton className="aspect-square w-full rounded-xl" />
              <Skeleton className="h-4 w-3/4 rounded-md" />
              <Skeleton className="h-3 w-1/2 rounded-md" />
              <div className="flex items-center justify-between pt-1">
                <Skeleton className="h-4 w-14 rounded-md" />
                <Skeleton className="size-8 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
