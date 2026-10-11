import { useSignOut } from '@smartapp/api';
import { WORDS } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';

export function LogOutButton() {
  const signOut = useSignOut();
  return (
    <Button
      variant="outline"
      size="lg"
      disabled={signOut.isPending}
      onClick={() => {
        signOut.mutate();
      }}
    >
      {WORDS.dashboard.auth.logOut}
    </Button>
  );
}
