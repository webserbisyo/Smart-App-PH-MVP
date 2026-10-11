# Checkpoint P3b: Owner auth, shop setup, guards and customer email-code sign-in

Build Plan v1.1, Phase 3, checkpoints 3.2 to 3.5. System paper 5, 6.1, 6.7, 8.1, 8.2, 10.
Revised 2026-10-11. Runs after P3a is merged to `dev` and deployed, and after the Auth config from P2.6 was pushed
(db-deploy run by hand with "Push Auth config" ticked). Without that, codes come from Supabase's built-in email,
which only reaches your own team address a few times an hour.

To run it, paste this one line into a Claude Code session on `webserbisyo/Smart-App-PH-MVP`:

> Read docs/prompts/P3b-auth-and-guards.md and do exactly that checkpoint.

---

## Goal

A new owner goes from sign-up to the dashboard after one SQL approval; every dashboard route is guarded by the
signed-in owner and the shop's status; a customer can sign in on a storefront with an email code and is never
treated as an owner. This checkpoint also lays the `packages/api` foundation every later slice builds on.

## Read first

`CLAUDE.md`, `docs/api-surface.md` (conventions and slice 0: build exactly those names), `docs/stack-versions.md`
security notes, system paper 5, 6.1, 6.7 and 10, the P3a migration, `packages/core/src/contracts/db-functions.ts`,
`apps/dashboard/src/app/router.tsx` and `registry.ts`, `apps/storefront/src/app/[shop]/layout.tsx`.
Start with a short plan that lists every file, then build.

## Build only

### 1. `packages/api` foundation

- Install `@supabase/supabase-js` 2.117.3 and `@supabase/ssr` 0.12.7 in `packages/api` only (pre-approved; re-check
  with `npm view` and keep these if they still exist). `react` as a peer dependency (the hooks use it).
- Clients (the app passes its env in; `packages/api` never reads `import.meta.env` or `process.env`):
  - `createDashboardClient({ url, publishableKey })`: browser client, session in localStorage.
  - `createStorefrontServerClient(env, cookies)`: `@supabase/ssr` server client; `cookies` is a small
    `{ getAll, setAll }` adapter the storefront passes in, so `packages/api` never imports `next`.
  - `createStorefrontBrowserClient(env)`: `@supabase/ssr` browser client.
  - `createPublicClient(env)`: no session persistence, for shop pages that must stay cacheable.
  - All typed with the generated `database.types.ts`.
- `ApiProvider` (React context holding the client) and `useApiClient()`.
- `keys.ts` (`qk`), `errors.ts` (`ApiError`, `toApiError(unknown)`): Postgres `raise exception '<code>'` messages
  and Supabase Auth error codes both map to `ApiErrorCode`.
- `packages/core/src/contracts/errors.ts`: the `ApiErrorCode` list for slice 0 (see `docs/api-surface.md`) and its
  words in `words.ts`. Later slices add their codes here.
- Row mappers to the core Zod shapes (snake_case → camelCase), parsed, no casts. Unit-test the mappers and
  `toApiError`.
- `auth/`: `signUpOwner` (stores `display_name` in user metadata), `verifyEmailCode` (`verifyOtp` with type
  `email`), `resendEmailCode`, `signIn`, `signOut`, `sendPasswordResetCode`, `resetPasswordWithCode`
  (`verifyOtp` type `recovery`, then `updateUser({ password })`), `sendCustomerCode` (`signInWithOtp`,
  `shouldCreateUser: true`), `verifyCustomerCode` (type `email`), `useSession`.
- `shops/`: `getMyShop` (the caller's active membership joined to the tenant, or null), `createMyShop`,
  `slugAvailable`, and their hooks.
- Delete `stubs.ts` only if nothing uses it; the storefront layout still does until P5.2, so keep it.

### 2. Owner auth screens (`apps/dashboard/src/features/auth/`)

Full-screen pages outside the shell. They are routes in `router.tsx` (not registry modules, because the registry
renders inside the shell). Build them in the final look with the installed kit (`card`, `field`, `input`,
`input-otp`, `button`, `sonner`), React Hook Form + Zod resolver, every text in `words.ts`:
- **Sign up**: name, email, password (min 8). Then **Enter code**: the 6-box `input-otp`, paste-friendly,
  "Send again" enabled after 60 s (the hosted limit is one email per minute). Verified → signed in → Setup.
- An email that already has an account (for example a customer who signed in on a storefront) gets no new code from
  Supabase. Show "This email already has an account. Log in, or use Forgot password to set a password." A customer
  who sets a password this way can then create a shop: one login, two roles, never mixed (section 4).
- **Log in**, **Log out** (account menu), **Forgot password**: email → code → new password, all in the app.
  No email links, no redirect URLs.

### 3. Shop setup and approval (3.3)

- **Setup** (signed in, no shop): business type as two big cards (Food: "Menu, Kitchen"; Retail: "Products,
  Packing", from `VOCAB`), shop name, link name prefilled from the name (lowercase, hyphens, accents removed),
  live availability (debounced 400 ms) showing `shop.webserbisyo.com/<slug>`, then `create_my_shop`.
- **Waiting for approval** (pending): shop name, "We will approve your shop soon", Refresh, Log out. Refetch on
  window focus; no polling.
- **Suspended**: "Your shop is paused. Message us to reactivate.", Log out.
- After the founder runs the approve SQL, Refresh lands on Home.

### 4. Guards (3.4)

Dashboard, in the TanStack Router tree (`beforeLoad`, using `queryClient.ensureQueryData`):
- A pure function `decideRoute(session, shop, path)` → `'ok' | { redirect }`, unit-tested for every case below.
- No session → `/login?redirect=<path>` (only same-app paths are accepted as `redirect`).
- Session, no shop → `/setup`; pending → `/pending`; suspended → `/suspended`.
- Active → the shell; auth pages send a signed-in active owner to Home.
- `onAuthStateChange`: on sign-in and sign-out, clear the query cache and `router.invalidate()`.
- The shell gets the tenant from `useMyShop()`; later slices read `tenantId` from there.

Storefront:
- `apps/storefront/src/proxy.ts` (Next 16, not `middleware.ts`): refreshes the Supabase session cookie. If the
  request has no `sb-` auth cookie, return at once without calling Supabase (guests are most traffic). Matcher skips
  `_next/static`, `_next/image`, images, `favicon.ico` and `manifest.webmanifest`.
- Server code that needs the user calls `getClaims()`; a cookie session is never trusted on its own. Only the
  Account page reads the user on the server. Shop home and menu never read the session on the server, so they can
  be cached in P6.
- Check whether the hosted project uses asymmetric JWT signing keys (Supabase → Project Settings → JWT Keys, or
  ask me) and say which in your reply; do not change keys.

### 5. Customer sign-in on the storefront (3.5)

- Account page (`/[shop]/account`): signed out shows "Sign in with your email" → email → 6-digit code. Signed in
  shows the email and Sign out. Plain and functional; the member card comes in P4.5.
- One customer login for the storefront host (`shop.webserbisyo.com`); being a member of a shop is a per-shop
  `customers` row that arrives in P5.5. Nothing here creates customer rows.
- The storefront never reads `tenant_members`; the dashboard requires an owner row. A customer login therefore
  never reaches the dashboard.

## Do not build

- No `customers` table, `join_as_member`, stamps or member card (P5.5, P4.5).
- No setup checklist (P4), no settings screens (P4.1), no Google or social login, no captcha on sign-up, no
  staff logins, no admin screen.

## Rules

- `pnpm check` green. No packages beyond the two above without asking. No `any`, no casts, no `@ts-ignore`.
  Never read or print `.env.local`.
- Add to `docs/decisions.md` under "## Phase 3":
  - P3-5: One customer login for the storefront host; membership is per shop (a `customers` row, P5.5). One
    login can be both a customer and an owner.
  - P3-6: `packages/api` exposes plain functions (client first) and hooks; screens use only the names in
    `docs/api-surface.md`.

## Done when (I will test on my phone)

- A new owner signs up, enters the 6-digit code, sets up "Juan's Cafe" (food, link `juans-cafe`) and sees
  "Waiting for approval". After I run the approve SQL and tap Refresh, they reach Home. Same for "Tala Apparel"
  (retail, `tala-apparel`) with a second email. (Tip: if your Gmail is `yourname@gmail.com`, sign up
  the first shop as `yourname+cafe@gmail.com` and the second as `yourname+tala@gmail.com`. Both reach your normal
  inbox, but Supabase treats them as two different owners. Use exactly the links `juans-cafe` and `tala-apparel`:
  they become the demo shops in P5.2, decision P5-13.)
- A taken or reserved link name is refused on the setup screen.
- A logged-out visit to any dashboard page goes to Log in, and after logging in returns to that page.
- Forgot password with a code works; the old password stops working.
- Owner A sees only shop A; the P3a database tests still pass.
- On `/juans-cafe/account`, a customer signs in with an email code and sees their email; that email cannot log in
  to the dashboard.
- `pnpm check` is green.

## Finish

Commit `feat(p3b): owner auth, shop setup, guards, customer email sign-in` on your `claude/…` branch, push, open a
pull request into `dev`, then reply in 5 lines: what changed, how to test, the JWT signing key type, anything you
decided, and anything I must set by hand.
