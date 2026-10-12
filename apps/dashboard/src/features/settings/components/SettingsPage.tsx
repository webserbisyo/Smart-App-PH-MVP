import type { ReactNode } from 'react';

import { errorWords, WORDS } from '@smartapp/core';
import type { ApiErrorCode } from '@smartapp/core';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { useFormFactor } from '@smartapp/ui/hooks/use-form-factor';
import { useOnline } from '@smartapp/ui/hooks/use-online';
import { PageBody } from '@smartapp/ui/patterns/PageBody';
import { QueryState } from '@smartapp/ui/patterns/QueryState';
import { SettingsSection } from '@smartapp/ui/patterns/SettingsSection';

import { LeaveGuard } from '../../../app/LeaveGuard';
import { useVocab } from '../../../app/shop';

const shared = WORDS.shared;

interface Query {
  isPending: boolean;
  isError: boolean;
  refetch: () => unknown;
}

/** Waits for the page's data (skeleton, or the error with Try again), then shows the form. */
export function SettingsLoader({ queries, size = 'settings', children }: { queries: readonly Query[]; size?: 'settings' | 'wide'; children: () => ReactNode }) {
  const online = useOnline();
  const state = queries.some((query) => query.isPending) ? 'loading' : queries.some((query) => query.isError) ? 'error' : 'ready';
  if (state !== 'ready') {
    return (
      <PageBody size={size}>
        <QueryState
          state={state}
          skeleton={<Skeleton className="h-96 w-full rounded-xl" />}
          empty={{ title: '' }}
          error={{
            title: shared.loadFailed,
            retryLabel: shared.tryAgain,
            onRetry: () => {
              for (const query of queries) void query.refetch();
            },
          }}
          offline={online ? null : { title: shared.offlineShort }}
        />
      </PageBody>
    );
  }
  return <PageBody size={size}>{children()}</PageBody>;
}

export interface SettingsFormProps {
  title: string;
  description: string;
  dirty: boolean;
  saving: boolean;
  error: ApiErrorCode | null;
  onSave: () => void;
  /** Read when leaving: true while there are unsaved changes. */
  leaveWhen: () => boolean;
  children: ReactNode;
}

/** One settings page: a `SettingsSection` with its own Save (off while offline), the error, and the leave guard. */
export function SettingsForm({ title, description, dirty, saving, error, onSave, leaveWhen, children }: SettingsFormProps) {
  const online = useOnline();
  const phone = useFormFactor() === 'phone';
  const vocab = useVocab();
  const note = !online ? (
    <span className="text-muted-foreground">{WORDS.dashboard.settings.offline}</span>
  ) : error ? (
    <span role="alert" className="text-destructive-text">
      {errorWords(error, vocab)}
    </span>
  ) : null;
  return (
    <>
      <SettingsSection
        title={title}
        description={description}
        dirty={dirty}
        saving={saving}
        onSave={onSave}
        words={shared}
        disabled={!online}
        note={note}
        aboveDock={phone}
      >
        {children}
      </SettingsSection>
      <LeaveGuard when={leaveWhen} />
    </>
  );
}
