# Deploy: Supabase, GitHub Actions, Vercel

Keys go into `.env.local`, GitHub settings and Vercel settings. Never into chat, code or a commit.

## 1. GitHub secrets (migrations)

Migrations reach the hosted Supabase project only through the `db-deploy` workflow
(`.github/workflows/db-deploy.yml`, decision P2-2). It runs on every push to `dev` that changes
`supabase/migrations/**`, and by hand.

Repository → Settings → Secrets and variables → Actions:

| Kind | Name | Where to find it |
| --- | --- | --- |
| Secret | `SUPABASE_ACCESS_TOKEN` | supabase.com → Account → Access Tokens → Generate new token |
| Secret | `SUPABASE_DB_PASSWORD` | The project's database password (Project Settings → Database; reset it there if lost) |
| Variable | `SUPABASE_PROJECT_REF` | Project Settings → General → Reference ID |

Then run it once by hand: Actions → db-deploy → Run workflow (branch `dev`). With no migrations yet it
must finish green with "Remote database is up to date".

If `supabase link` or `db push` fails to reach the database over IPv6, switch the push step to the
session pooler: add a secret `SUPABASE_DB_URL` with the "Session pooler" connection string
(Project Settings → Database → Connect) and run `supabase db push --db-url "$SUPABASE_DB_URL"`.

## 2. Vercel (two projects, already imported)

They fail to build until P2 lands on the branch Vercel builds; after that every push to `dev` gets preview links.

| Setting | `storefront` | `dashboard` |
| --- | --- | --- |
| Root Directory | `apps/storefront` | `apps/dashboard` |
| Framework Preset | Next.js | Vite |
| Output Directory | default | `dist` |
| Install / Build Command | default | default |
| Node.js Version | 24.x | 24.x |
| Include files outside the root directory in the Build Step | on | on |
| Function Region | `sin1` (set by `apps/storefront/vercel.json`) | none (static) |

Environment variables (Production and Preview), from Supabase → Project Settings → API Keys, the URL
and the **publishable** key only, never the secret key:

| Project | Names |
| --- | --- |
| `storefront` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| `dashboard` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` |

- Production Branch stays `main`; every push to `dev` gets preview links.
- The dashboard is a single-page app: `apps/dashboard/vercel.json` sends every path to `index.html`.
- Check the region: a storefront deployment → Functions should show `sin1`.
- Domains come in P6: `shop.webserbisyo.com` on `storefront`, `app.webserbisyo.com` on `dashboard`.
  Do not touch `webserbisyo.com` itself or `www`; they stay as they are.

## 3. Local (only on your own computer)

Copy `apps/storefront/.env.example` and `apps/dashboard/.env.example` to `.env.local` in the same
folder and fill in the two values each. Then `pnpm install` and `pnpm dev` (storefront on
http://localhost:3000, dashboard on http://localhost:5173).
