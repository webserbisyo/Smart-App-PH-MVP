import type { ReactNode } from 'react';

import { IconAlertTriangle, IconWifiOff } from '@tabler/icons-react';

import { Button } from '#components/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '#components/empty';

export type QueryStateKind = 'loading' | 'error' | 'empty' | 'ready';

export interface QueryStateProps {
  state: QueryStateKind;
  /** A skeleton in the shape of the content. */
  skeleton: ReactNode;
  empty: {
    /** A Fluent icon or a Tabler icon. */
    media?: ReactNode;
    title: string;
    description?: string;
    /** One action, for example "Add a product". */
    action?: ReactNode;
  };
  error: {
    title: string;
    retryLabel: string;
    onRetry: () => void;
  };
  /** With the error state: say it is the connection, not the app. */
  offline?: { title: string } | null;
  children?: ReactNode;
}

/**
 * The four states of every list and page (UX-9): loading (your skeleton), error (what failed + Try again), offline
 * (when the error is the connection) and empty (one line, one action). The content renders only when ready.
 */
export function QueryState({ state, skeleton, empty, error, offline = null, children }: QueryStateProps) {
  if (state === 'loading') {
    return (
      <div aria-busy="true" data-slot="query-loading">
        {skeleton}
      </div>
    );
  }
  if (state === 'error') {
    return (
      <Empty role="alert" className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">{offline ? <IconWifiOff /> : <IconAlertTriangle />}</EmptyMedia>
          <EmptyTitle>{offline ? offline.title : error.title}</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" onClick={error.onRetry}>
            {error.retryLabel}
          </Button>
        </EmptyContent>
      </Empty>
    );
  }
  if (state === 'empty') {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          {empty.media && <EmptyMedia variant="icon">{empty.media}</EmptyMedia>}
          <EmptyTitle>{empty.title}</EmptyTitle>
          {empty.description && <EmptyDescription>{empty.description}</EmptyDescription>}
        </EmptyHeader>
        {empty.action && <EmptyContent>{empty.action}</EmptyContent>}
      </Empty>
    );
  }
  return <>{children}</>;
}
