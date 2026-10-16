'use client';

import { useState, useSyncExternalStore } from 'react';

import { installOffer, installPlatform, parseDismissedAt, WORDS } from '@smartapp/core';
import type { InstallPlatform } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@smartapp/ui/components/responsive-dialog';
import { IconDeviceMobileDown, IconSquareArrowUp, IconSquarePlus } from '@smartapp/ui/icons';
import { cn } from '@smartapp/ui/lib/utils';

import { useShop } from '../shell/ShopProvider';
import { subscribeNothing, useHydrated } from '../shell/use-hydrated';
import { canPromptInstall, isStandalone, promptInstall, readDismissedRaw, saveDismissed, subscribeInstallPrompt, subscribeStandalone } from './install-prompt';

const words = WORDS.storefront.install;

/** On the server nothing is offered, so the page never renders a card the browser would then remove. */
const SERVER_PLATFORM: InstallPlatform = 'in_app';

function readPlatform(): InstallPlatform {
  return installPlatform(window.navigator.userAgent, window.navigator.maxTouchPoints);
}

/** Simple drawings of the three Safari steps (no screenshots): the Share button, the menu row, and Add. */
function StepDrawing({ step }: { step: number }) {
  const highlight = 'rounded-md bg-shop-10 text-shop-10-foreground';
  if (step === 0) {
    return (
      <div aria-hidden="true" className="flex h-12 items-center justify-around rounded-lg border bg-muted px-2 text-muted-foreground">
        <span className="h-2 w-6 rounded-full bg-muted-foreground/30" />
        <span className={cn('p-1.5', highlight)}>
          <IconSquareArrowUp className="size-5" />
        </span>
        <span className="h-2 w-6 rounded-full bg-muted-foreground/30" />
      </div>
    );
  }
  if (step === 1) {
    return (
      <div aria-hidden="true" className="flex flex-col gap-1 rounded-lg border bg-muted p-2 text-sm">
        <span className="h-2 w-20 rounded-full bg-muted-foreground/30" />
        <span className={cn('flex items-center justify-between px-2 py-1.5 font-medium', highlight)}>
          {words.drawing.menuRow}
          <IconSquarePlus className="size-5" />
        </span>
        <span className="h-2 w-24 rounded-full bg-muted-foreground/30" />
      </div>
    );
  }
  return (
    <div aria-hidden="true" className="flex h-12 items-center justify-between rounded-lg border bg-muted px-3 text-sm">
      <span className="h-2 w-12 rounded-full bg-muted-foreground/30" />
      <span className={cn('px-3 py-1 font-semibold', highlight)}>{words.drawing.add}</span>
    </div>
  );
}

/** iPhone: Share → Add to Home Screen → Add, drawn. */
function IosSteps({ open, onOpenChange, shopName }: { open: boolean; onOpenChange: (open: boolean) => void; shopName: string }) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="gap-4 px-4 pb-4 sm:max-w-md">
        <ResponsiveDialogHeader className="px-0 text-left">
          <ResponsiveDialogTitle>{words.iosTitle(shopName)}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>{words.text}</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ol className="flex flex-col gap-4">
          {words.steps.map((step, index) => (
            <li key={step.title} className="flex flex-col gap-2">
              <div className="flex items-start gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background" aria-label={words.stepLabel(index + 1)}>
                  {index + 1}
                </span>
                <span className="flex flex-col">
                  <span className="font-semibold">{step.title}</span>
                  <span className="text-sm text-muted-foreground">{step.text}</span>
                </span>
              </div>
              <StepDrawing step={index} />
            </li>
          ))}
        </ol>
        <Button
          size="lg"
          variant="shop"
          onClick={() => {
            onOpenChange(false);
          }}
        >
          {words.gotIt}
        </Button>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

/**
 * "Add <shop> to your home screen" (paper 14). Android and desktop: the browser's install prompt. iPhone: the drawn
 * steps. Hidden when opened from the home screen, in Facebook and Messenger's browsers, and for 14 days after Not now.
 */
export function InstallCard({ className }: { className?: string }) {
  const hydrated = useHydrated();
  const { storefront } = useShop();
  const { slug, name } = storefront.shop;
  const canPrompt = useSyncExternalStore(subscribeInstallPrompt, canPromptInstall, () => false);
  const standalone = useSyncExternalStore(subscribeStandalone, isStandalone, () => false);
  const platform = useSyncExternalStore(subscribeNothing, readPlatform, () => SERVER_PLATFORM);
  const [dismissedAt, setDismissedAt] = useState(() => (typeof window === 'undefined' ? null : parseDismissedAt(readDismissedRaw(slug))));
  const [now] = useState(() => Date.now());
  const [stepsOpen, setStepsOpen] = useState(false);
  const offer = installOffer({ platform, standalone, dismissedAt, now, canPrompt });

  if (!hydrated || offer === 'none') return null;
  return (
    <section aria-labelledby="install-title" className={cn('flex flex-col gap-3 rounded-xl border bg-card p-4 print:hidden', className)}>
      <div className="flex items-start gap-3">
        <IconDeviceMobileDown aria-hidden="true" className="mt-0.5 size-6 shrink-0" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 id="install-title" className="font-semibold">
            {words.title(name)}
          </h2>
          <p className="text-sm text-muted-foreground">{words.text}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="ghost"
          onClick={() => {
            const at = Date.now();
            saveDismissed(slug, at);
            setDismissedAt(at);
          }}
        >
          {words.notNow}
        </Button>
        <Button
          variant="shop"
          onClick={() => {
            if (offer === 'prompt') void promptInstall();
            else setStepsOpen(true);
          }}
        >
          {offer === 'prompt' ? words.install : words.howTo}
        </Button>
      </div>
      {offer === 'ios_steps' && <IosSteps open={stepsOpen} onOpenChange={setStepsOpen} shopName={name} />}
    </section>
  );
}
