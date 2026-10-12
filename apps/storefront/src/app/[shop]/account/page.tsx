import { getVerifiedUser } from '@smartapp/api';
import { WORDS } from '@smartapp/core';

import { AccountSignIn } from '../../../features/account/AccountSignIn';
import { serverClient } from '../../../features/account/server-client';
import { SignOutButton } from '../../../features/account/SignOutButton';

const words = WORDS.storefront.account;

/**
 * The only storefront page that reads the user on the server (verified claims, never the cookie alone).
 * Plain for now; the member card comes in P4.6.
 */
export default async function AccountPage() {
  const user = await getVerifiedUser(await serverClient());
  return (
    <section className="mx-auto flex w-full max-w-sm flex-col gap-6 py-6">
      <h1 className="text-2xl font-semibold">{user ? words.title : words.signIn}</h1>
      {user ? (
        <div className="flex flex-col gap-4">
          <p>{words.signedInAs(user.email)}</p>
          <SignOutButton />
        </div>
      ) : (
        <AccountSignIn />
      )}
    </section>
  );
}
