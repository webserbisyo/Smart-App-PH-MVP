import type { ReactNode } from 'react';

import { WORDS } from '@smartapp/core';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@smartapp/ui/components/card';

/** A full-screen page outside the shell: app name, one card, an optional line under it. */
export function AuthPage({ title, intro, children, footer }: { title: string; intro?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-muted/40 px-4 py-10">
      <p className="text-sm font-semibold tracking-tight text-muted-foreground">{WORDS.app.name}</p>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
          {intro ? <CardDescription>{intro}</CardDescription> : null}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
      {footer ? <div className="text-center text-sm text-muted-foreground">{footer}</div> : null}
    </main>
  );
}
