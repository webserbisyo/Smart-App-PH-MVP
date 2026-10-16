import Link from 'next/link';

import { buttonVariants } from '@smartapp/ui/components/button';
import { IconBuildingStore, IconHome } from '@smartapp/ui/icons';
import { cn } from '@smartapp/ui/lib/utils';

export default function RootNotFound() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-6 text-center bg-background text-foreground">
      <div className="flex max-w-sm flex-col items-center gap-4">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <IconBuildingStore className="size-7 stroke-[1.5]" />
        </div>

        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-bold tracking-tight">Shop not found</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The shop you&apos;re looking for doesn&apos;t exist, was moved, or is currently paused.
          </p>
        </div>

        <div className="flex flex-col gap-2 w-full pt-2">
          <Link href="/" className={cn(buttonVariants({ variant: 'default' }), 'w-full gap-2')}>
            <IconHome className="size-4" />
            Go to Smart App PH
          </Link>
          <a
            href="https://app.webserbisyo.com"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
          >
            Owner sign-in
          </a>
        </div>
      </div>
    </main>
  );
}
