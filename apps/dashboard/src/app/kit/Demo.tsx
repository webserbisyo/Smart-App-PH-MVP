import type { ReactNode } from 'react';

/** One kit entry: the component rendered twice, in a light panel and a dark panel (stacked on phones). */
export function Demo({ name, children }: { name: string; children: (theme: 'light' | 'dark') => ReactNode }) {
  return (
    <section aria-label={name} className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-muted-foreground">{name}</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="light flex min-w-0 flex-col items-start gap-3 overflow-hidden rounded-xl border border-border bg-background p-4 text-foreground">
          {children('light')}
        </div>
        <div className="dark flex min-w-0 flex-col items-start gap-3 overflow-hidden rounded-xl border border-border bg-background p-4 text-foreground">
          {children('dark')}
        </div>
      </div>
    </section>
  );
}
