import type { ReactNode, SubmitEvent } from 'react';

import { Button } from '#components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#components/card';
import { Spinner } from '#components/spinner';
import { cn } from '#lib/utils';

import { StickyActionBar } from './StickyActionBar';

export interface SettingsSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  /** Save is shown only while there are unsaved changes. */
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  words: { save: string; saving: string };
  /** Save cannot be pressed (offline); `note` says why, next to the button. */
  disabled?: boolean;
  note?: ReactNode;
  /** Dashboard phone screens: keep the Save bar above the bottom dock. */
  aboveDock?: boolean;
  className?: string;
}

/** One settings section: a card of 5 to 7 fields with its own Save, which sticks to the bottom while editing. */
export function SettingsSection({ title, description, children, dirty, saving, onSave, words, disabled = false, note, aboveDock = false, className }: SettingsSectionProps) {
  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (dirty && !saving && !disabled) onSave();
  };
  return (
    <Card className={cn('gap-0 overflow-visible pb-0', className)}>
      <form onSubmit={submit} className="flex flex-col">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pb-4">{children}</CardContent>
        {dirty && (
          <StickyActionBar aboveDock={aboveDock} className="mx-0 flex-wrap justify-end rounded-b-xl">
            {note ? <div className="min-w-0 flex-1 text-sm">{note}</div> : null}
            <Button type="submit" disabled={saving || disabled}>
              {saving && <Spinner />}
              {saving ? words.saving : words.save}
            </Button>
          </StickyActionBar>
        )}
      </form>
    </Card>
  );
}
