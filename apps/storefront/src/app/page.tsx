import { WORDS } from '@smartapp/core';

export default function RootPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4 text-center">
      <p className="text-base text-muted-foreground">{WORDS.storefront.rootHint}</p>
    </main>
  );
}
