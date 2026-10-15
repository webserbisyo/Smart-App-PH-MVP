# Local development (Supabase in Docker)

The whole stack runs on your computer: database, auth, storage, realtime, Studio and a mail viewer. Agents get full
access to this local database. The live database changes only through a migration file in a PR (merged into
`dev`, then the `db-deploy` Action applies it).

## One-time setup

- Docker running (founder's Mac: Docker Desktop 4.41.2, auto-update off). Settings → Resources → Memory: **4 GB**
  (3 GB is the minimum; the lean stack below uses about 1 GB, the apps and editor need the rest).
- `pnpm install` (installs the Supabase CLI from the repo).

## Daily commands

| Command | What it does |
| --- | --- |
| `pnpm local start` | starts the lean stack (no edge functions, logs, analytics, image proxy or pooler: the apps do not use them). First run downloads images. |
| `pnpm local env local` | points both apps at the local database. Saves your live `.env.local` once as `.env.live.local`. |
| `pnpm dev` | storefront http://localhost:3000, dashboard http://localhost:5173 |
| `pnpm local env live` | puts the live `.env.local` files back. Restart `pnpm dev` after switching. |
| `pnpm local stop` | stops Docker containers; local data is kept. |
| `pnpm local status` | local URLs, or "Not running." |
| `pnpm local reset` | rebuilds the local database from `supabase/migrations`, then `supabase/seed.sql` adds the demo shops. Clears local sign-ups. |
| `pnpm local demo` | refreshes demo orders and customers (`private.demo_reset`) for `juans-cafe` and `tala-apparel`. |
| `pnpm local owner <email> <slug>` | makes a local account the owner of a demo shop (see below). |

Local tools: Studio (tables, SQL editor) http://localhost:54323. Mail viewer (every 6-digit code) http://localhost:54324.

## Demo shops locally

No mock data: the demo shops come from the same SQL as live.
1. `pnpm local reset` (seed creates `juans-cafe` and `tala-apparel`), then `pnpm local demo` for orders and members.
2. Open the dashboard, sign up with any email (for example `owner+cafe@example.com`), read the code at
   http://localhost:54324, enter it, and stop at the Setup screen.
3. `pnpm local owner owner+cafe@example.com juans-cafe`, then reload the dashboard. One account owns one shop, so use a
   second email for `tala-apparel`.

## Database work (agents)

1. Write a **new** file in `supabase/migrations/` (`pnpm exec supabase migration new <name>`).
2. `pnpm local reset` to apply everything from scratch, `pnpm db:test` for pgTAP, `pnpm db:types` and commit the types.
3. Locally anything goes: Studio, `psql`, the local MCP at http://localhost:54321/mcp, resets.
4. Never against the hosted project: no `supabase db push`, `db reset --linked`, `migration repair` or any other
   command that writes to the linked project. The PR merge deploys the migration.

## When something fails

- "Cannot connect to the Docker daemon": start Docker Desktop and wait for it to say running.
- Port already in use (54321 to 54324): `pnpm local stop`, or quit the other Supabase project.
- Apps still show live data: run `pnpm local env local` and restart `pnpm dev`.
- Everything broken: `pnpm local stop`, `pnpm local start`, `pnpm local reset`.
