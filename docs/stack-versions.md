# Stack versions

Exact versions, no `^`. "P1"/"P2" means installed in that phase; "later" rows are targets, re-checked with
`npm view <pkg> version` when they are installed. Versions checked on 2026-10-11.

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
| supabase (CLI) | 2.120.0 | P2 | root devDependency; same version in `db-deploy` |
| eslint-plugin-react-hooks | 7.1.1 | P2 | apps and packages/ui |

## Apps and shared packages (system paper 8.2)

| Layer | Package | Version | Status | Notes |
| --- | --- | --- | --- | --- |
| Storefront | next | 16.4.0 | P2 installed | never below 16.3.8 (security fixes); App Router; `proxy.ts`, not middleware; params are async |
| Storefront, dashboard | react, react-dom | 19.3.0 | P2 installed | |
| Dashboard | vite (+ @vitejs/plugin-react 6.1.2) | 8.3.4 | P2 installed | builds a static app for Capacitor |
| Dashboard | @tanstack/react-router | 1.170.42 | P2 installed | code-based routes |
| Data | @tanstack/react-query | 5.104.2 | P2 installed | hooks live in packages/api |
| Styling | tailwindcss (+ @tailwindcss/vite, @tailwindcss/postcss) | 4.3.3 | P2 installed | CSS-first, one tokens file |
| Components | shadcn (CLI, run with `pnpm dlx`, not installed) | 4.21.4 | P2 used | components installed into packages/ui |
| Icons | @tabler/icons-react | 3.49.0 | P2 installed | |
| Forms | react-hook-form | 7.90.0 | P2 installed | dashboard |
| Forms | @hookform/resolvers | 5.9.1 | P2 installed | Zod resolver |
| QR codes | qrcode (via DiceUI `qr-code`) + @types/qrcode 1.5.6 (dev) | 1.5.4 | P4.0 installed | receipt QR, shop QR; replaces qrcode.react (decision P4-F2); loaded only when a QR is shown |
| Backend | @supabase/supabase-js | 2.117.3 | P3b | only in packages/api |
| Backend | @supabase/ssr | 0.12.7 | P3b | storefront cookie sessions, only in packages/api |
| Native (later) | @capacitor/core | 8.5.3 | after launch | Capacitor 8 |

UI kit packages added by the shadcn CLI with the components (`packages/ui`, P2 installed): @base-ui/react 1.9.0,
@base-ui/utils 0.5.0, class-variance-authority 0.7.1, clsx 2.1.1, tailwind-merge 3.7.0, tw-animate-css 1.4.0,
@fontsource-variable/plus-jakarta-sans 5.3.0, recharts 3.8.0, sonner 2.0.8, input-otp 1.5.0, react-day-picker 10.0.2,
date-fns 4.4.0, @tanstack/react-table 9.2.8, @dnd-kit/core 6.3.1, @dnd-kit/sortable 10.0.0, @dnd-kit/modifiers 9.0.0,
@dnd-kit/utilities 3.2.2, motion 14.1.0 (number ticker), canvas-confetti 1.9.4. Types: @types/react 19.3.0,
@types/react-dom 19.3.0, @types/node 24.19.2, @types/canvas-confetti 1.9.0. Env checks use zod 4.6.6 in both apps.
P4.0 added six kit components with no new npm package besides qrcode: DiceUI responsive-dialog, qr-code, stat, status,
scroller and shadcn progress (kit total 57).
SF1 added kit components for storefront v2: @reui/use-file-upload (hook), @diceui/cropper, @diceui/banner,
carousel (embla-carousel-react 8.6.0, embla-carousel-autoplay 8.6.0 exact, decision SF-4), @magicui/dot-pattern,
@magicui/shine-border. Removed DiceUI file-upload.tsx.

pnpm `onlyBuiltDependencies`: none needed. No installed package needs an install script (Supabase CLI, Tailwind
oxide and lightningcss ship platform binaries as optional dependencies).

Services (no package): Supabase (Postgres, Auth, Storage, Realtime, pg_cron), Vercel (two projects),
Resend (Supabase Auth SMTP), Cloudflare Turnstile.

## Security notes

- Next.js is never below 16.3.8.
- The storefront uses `proxy.ts` (session refresh), not `middleware.ts`.
- Server code checks the user with `getClaims()`; a session read from a cookie is never trusted on its own.
- The apps hold only the Supabase URL and the publishable key. The secret key lives only in scripts and Edge Functions.
- Never read or print `.env.local`; only `.env.example` files are committed.
