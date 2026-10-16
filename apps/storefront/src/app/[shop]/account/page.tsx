import { getVerifiedUser } from '@smartapp/api';

import { serverClient } from '../../../features/account/server-client';
import { Account } from '../../../features/members/Account';

/**
 * The only storefront page that reads the user on the server (verified claims, never the cookie alone), so the
 * first paint already knows signed in or out. The member card, orders and addresses load in the browser (P4.6).
 */
export default async function AccountPage() {
  const user = await getVerifiedUser(await serverClient());
  return (
    <section className="mx-auto flex w-full max-w-[640px] flex-col gap-6 px-4 py-4 sm:py-6">
      <Account serverSignedIn={user !== null} />
    </section>
  );
}
