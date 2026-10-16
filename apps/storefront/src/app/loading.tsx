import { Skeleton } from '@smartapp/ui/components/skeleton';

export default function RootLoading() {
  return (
    <main className="min-h-dvh flex flex-col p-6 max-w-xl mx-auto gap-6 pt-12 animate-pulse">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-28 rounded-md" />
        <Skeleton className="h-9 w-3/4 rounded-lg" />
        <Skeleton className="h-4 w-full rounded-md" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-36 rounded-md" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    </main>
  );
}
