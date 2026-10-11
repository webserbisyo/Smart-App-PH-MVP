import type { ReactNode } from 'react';

import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '#components/empty';

/** An empty page: icon, title and one line, until the page's checkpoint fills it. */
export function EmptyPage({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <Empty className="min-h-[50dvh] border border-dashed border-border">
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon}</EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{text}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
