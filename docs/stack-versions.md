# Stack versions

Exact versions, no `^`. "P1" means installed now; "P2" means the target for Phase 2, re-checked with
`npm view <pkg> version` when it is installed. Versions checked on 2026-10-11.

## Runtime and tooling

| Package | Version | Status | Notes |
| --- | --- | --- | --- |
| Node.js | 24 LTS (24.21.0 tested) | P1 | `.nvmrc`, `engines`, `engine-strict=true` |
| pnpm | 10.28.0 | P1 | pinned in root `packageManager` |
| turbo | 2.11.7 | P1 | `pnpm check` = `turbo run typecheck lint test` |
| typescript | 6.0.3 | P1 | strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes, verbatimModuleSyntax |
| zod | 4.6.6 | P1 | in `@smartapp/core` |
| eslint | 10.12.0 | P1 | flat config, `eslint.config.js` |
| typescript-eslint | 8.71.1 | P1 | strict type-checked |
| vitest | 5.0.3 | P1 | |
| supabase (CLI) | 2.120.0 | P2 | P2.4 |

## Apps and shared packages (system paper 8.2)

| Layer | Package | Version | Status | Notes |
| --- | --- | --- | --- | --- |
| Storefront | next | 16.4.0 | P2 | never below 16.3.8 (security fixes); App Router; `proxy.ts`, not middleware; params are async |
| Storefront, dashboard | react, react-dom | 19.3.0 | P2 | |
| Dashboard | vite | 8.3.4 | P2 | builds a static app for Capacitor |
| Dashboard | @tanstack/react-router | 1.170.42 | P2 | code-based routes |
| Data | @tanstack/react-query | 5.104.1 | P2 | hooks live in packages/api |
| Styling | tailwindcss (+ @tailwindcss/vite, @tailwindcss/postcss) | 4.3.3 | P2 | CSS-first, one tokens file |
| Components | shadcn (CLI) | 4.21.4 | P2 | components installed into packages/ui |
| Icons | @tabler/icons-react | 3.49.0 | P2 | |
| Forms | react-hook-form | 7.90.0 | P2 | dashboard |
| Forms | @hookform/resolvers | 5.9.1 | P2 | Zod resolver |
| QR codes | qrcode.react | 4.2.0 | P2 | receipt QR, shop QR |
| Backend | @supabase/supabase-js | 2.117.3 | P2 | only in packages/api |
| Backend | @supabase/ssr | 0.12.7 | P2 | storefront cookie sessions, only in packages/api |
| Native (later) | @capacitor/core | 8.5.3 | after launch | Capacitor 8 |

Services (no package): Supabase (Postgres, Auth, Storage, Realtime, pg_cron), Vercel (two projects),
Resend (Supabase Auth SMTP), Cloudflare Turnstile.

## Security notes

- Next.js is never below 16.3.8.
- The storefront uses `proxy.ts` (session refresh), not `middleware.ts`.
- Server code checks the user with `getClaims()`; a session read from a cookie is never trusted on its own.
- The apps hold only the Supabase URL and the publishable key. The secret key lives only in scripts and Edge Functions.
- Never read or print `.env.local`; only `.env.example` files are committed.
