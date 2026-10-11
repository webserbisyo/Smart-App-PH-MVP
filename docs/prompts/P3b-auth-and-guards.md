# Checkpoint P3b: Owner auth, shop setup, guards and customer email-code sign-in

Build Plan v1.1, Phase 3, checkpoints 3.2 to 3.5. System paper 5, 6.1, 6.7, 8.1, 8.2, 10.

Runs after P3a is on `dev` and deployed, and after P2.6 (email codes need Resend). Without P2.6, Supabase's built-in email only reaches your own Supabase team address, a few times an hour.

To run it, paste this one line into a Claude Code session on `webserbisyo/Smart-App-PH-MVP`:

> Read docs/prompts/P3b-auth-and-guards.md and do exactly that checkpoint.

---

## Goal

A new owner goes from sign-up to the dashboard after one SQL approval, every dashboard route is guarded by the signed-in owner and the shop's status, and a customer can sign in on a storefront with an email code without ever being treated as an owner.

## Read first

`CLAUDE.md`, `docs/stack-versions.md` security notes, system paper 5, 6.1, 6.7 and 10, the P3a migration, and `packages/core/src/contracts/db-functions.ts`. Start with a short plan that lists every file, then build.

## Build only

### 1. Supabase clients in `packages/api` (the only place that imports `@supabase/*`)

- Install `@supabase/supabase-js` and `@supabase/ssr` at the versions in `docs/stack-versions.md` (pre-approved).
- `createDashboardClient({ url, publishableKey })`: browser client, session in localStorage. The app passes its env in; `packages/api` never reads `import.meta.env` or `process.env`.
- `createStorefrontServerClient({ url, publishableKey }, cookies)` and `createStorefrontBrowserClient(...)` with `@supabase/ssr`. `cookies` is a small `{ getAll, setAll }` adapter the storefront passes in, so `packages/api` does not import `next`.
- Use the generated `database.types.ts`. Map rows to the `packages/core` Zod shapes (camelCase) and parse them; no casts.
- `packages/api/src/auth/`: `signUpOwner`, `verifyEmailCode`, `signIn`, `signOut`, `sendPasswordResetCode`, `resetPasswordWithCode`, `sendCustomerCode`, `verifyCustomerCode`.
- `packages/api/src/shops/`: `getMyShop` (the caller's membership joined to the tenant, or null), `createMyShop`, `slugAvailable`.
- TanStack Query hooks for these, with query keys in one file. Map the `create_my_shop` error codes (`already_has_shop`, `slug_taken`, `slug_reserved`, `slug_invalid`) to words.

### 2. Owner auth in the dashboard (`apps/dashboard/src/features/auth/`, 3.2)

Screens, React Hook Form + Zod resolver, every text from the words file:
- **Sign up**: name, email, password (min 8). Then **Enter code**: 6 boxes, paste-friendly, "Send again" after 60 s. Verified → signed in.
- **Log in**, **Log out** (account menu), **Forgot password**: email → code → new password, all in-app (`verifyOtp` type `recovery`, then `updateUser`). No email links, no redirect URLs.
- Add the `auth` module to the registry (routes only, no nav entry).

### 3. Shop setup and approval (3.3)

- **Setup** (signed in, no shop): business type as two big cards (Food: "Menu, Kitchen"; Retail: "Products, Packing"), shop name, link name prefilled from the name (lowercase, hyphens), live `slug_available` check (debounced 400 ms) showing `shop.webserbisyo.com/<slug>`, then `create_my_shop`.
- **Waiting for approval** (pending): the shop name, "We will approve your shop soon", a Refresh button, Log out. No polling; refetch on window focus.
- **Suspended**: "Your shop is paused. Message us to reactivate.", Log out.
- After the founder runs the approve SQL, Refresh lands on the dashboard Home.

### 4. Guards (3.4)

Dashboard, in the TanStack Router route tree (`beforeLoad`, using `queryClient.ensureQueryData`):
- no session → `/login?redirect=<path>`
- session, no shop → `/setup`
- pending → `/pending`; suspended → `/suspended`
- active → the app; auth pages redirect a signed-in active owner to Home
- `onAuthStateChange` clears the query cache and invalidates the router on sign-in and sign-out.

Storefront:
- `apps/storefront/src/proxy.ts` (Next 16, not `middleware.ts`): refreshes the Supabase session cookie. If the request has no Supabase auth cookie, return immediately without calling Supabase (guests are most traffic). Matcher skips `_next/static`, `_next/image`, images, `favicon.ico`, `manifest.webmanifest`.
- Server code that needs the user calls `getClaims()`; a cookie session is never trusted on its own. Only the Account page reads the user on the server. Shop home and menu never read the session on the server, so they can be cached later (P6).
- Check in Supabase → Project Settings → JWT Keys whether the project uses asymmetric signing keys (then `getClaims()` verifies locally). Say which in your reply; do not change keys.

### 5. Customer sign-in on the storefront (3.5)

- Account page (`/[shop]/account`): signed out shows "Sign in with your email" → email → 6-digit code (`signInWithOtp` with `shouldCreateUser: true`, then `verifyOtp` type `email`). Signed in shows the email and Sign out.
- One customer session for the whole storefront host (`shop.webserbisyo.com`); being a member of a shop is a per-shop `customers` row that arrives in P5.5. Nothing in this checkpoint creates customer rows.
- The storefront never reads `tenant_members`; the dashboard requires a `tenant_members` owner row. A customer login therefore never reaches the dashboard (it has no password and no shop).

## Do not build

- No `customers` table, `join_as_member`, stamps or member card (P5.5, P4.3).
- No dashboard setup checklist (P4.6), no settings screens (P4.7), no Google or social login, no captcha on sign-up, no staff logins.
- No admin screen: approval stays founder SQL.

## Rules

- `pnpm check` green. Unit-test the mapping and error-code functions in `packages/api` and the guard decision function (pure function of session + shop → redirect) in the dashboard.
- No packages beyond `@supabase/supabase-js` and `@supabase/ssr` without asking. No `any`, no casts, no `@ts-ignore`. Never read or print `.env.local`.
- Add to `docs/decisions.md` under "## Phase 3":
  - P3-1: One customer login for the storefront host; membership is per shop (a `customers` row, P5.5).
  - P3-2: Owners can change only the shop name and settings, and only while active; slug, status, plan and paid_until change only by founder SQL.
  - P3-3: `create_my_shop` makes default hours from P5.1, when `business_hours` exists.

## Done when (I will test on a phone with Juan's Cafe and Tala Apparel)

- A new owner signs up, enters the 6-digit email code, sets up "Juan's Cafe" (food) and sees "Waiting for approval". After I run the approve SQL and tap Refresh, they reach the dashboard. Same for "Tala Apparel" (retail) with a second email.
- A taken or reserved link name is refused on the setup screen.
- A logged-out visit to any dashboard page goes to Log in, and after logging in returns to that page.
- Forgot password with a code works; the old password stops working.
- Owner A cannot see Owner B's shop: the dashboard shows only A's, and the database test from P3a still passes.
- On `/juans-cafe/account`, a customer signs in with an email code and sees their email; the same email on the dashboard Log in cannot get in.
- `pnpm check` is green.

## Finish

Commit `feat(p3b): owner auth, shop setup, guards, customer email sign-in`, push `dev` (or your `claude/…` branch and say so), then reply in 5 lines: what changed, how to test, the JWT signing key type, anything you had to decide, and anything I must set by hand.
