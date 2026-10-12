import { useBlocker } from '@tanstack/react-router';

import { WORDS } from '@smartapp/core';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@smartapp/ui/components/alert-dialog';
import { Button } from '@smartapp/ui/components/button';

const words = WORDS.dashboard.leave;

/**
 * Asks before leaving a page with unsaved changes (in-app links and closing the tab). `when` is read at the moment
 * of leaving, so a form that was just saved and reset lets the next navigation through.
 */
export function LeaveGuard({ when }: { when: () => boolean }) {
  const blocker = useBlocker({ shouldBlockFn: when, enableBeforeUnload: when, withResolver: true });
  return (
    <AlertDialog open={blocker.status === 'blocked'}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{words.title}</AlertDialogTitle>
          <AlertDialogDescription>{words.text}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => blocker.reset?.()}>
            {words.stay}
          </Button>
          <Button variant="destructive" onClick={() => blocker.proceed?.()}>
            {words.leave}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
