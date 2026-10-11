import { WORDS } from '@smartapp/core';

import { AuthPage } from '../components/AuthPage';
import { LogOutButton } from '../components/LogOutButton';

const words = WORDS.dashboard.suspended;

export default function SuspendedScreen() {
  return (
    <AuthPage title={words.title} intro={words.text}>
      <LogOutButton />
    </AuthPage>
  );
}
