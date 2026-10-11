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

## 4. Resend and Auth email (decision P2-4)

Every Supabase Auth email (sign-up, sign-in, password reset, email change) is a 6-digit code, never a
link, sent through Resend from `codes@mail.webserbisyo.com`. The Resend API key goes only into Supabase
settings. Never into chat, code or a commit.

### 4.1 DNS records for `mail.webserbisyo.com`

`mail.webserbisyo.com` is already added in Resend (region Tokyo, `ap-northeast-1`). Add these four
records where `webserbisyo.com`'s DNS is managed. Names are relative to `webserbisyo.com`; some hosts
want the full name (for example `send.mail.webserbisyo.com`).

| Type | Name | Value | Priority | TTL |
| --- | --- | --- | --- | --- |
| TXT | `resend._domainkey.mail` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDPZhadLTclI/LpT8R/BoFKgK3sKpbHgBxFcLj3yYYxwPYvgFaearCCeoV6W87Z1cqpFJjjgMnpfeaV8ObK7fPp1D/Y5uAX+IUUcmRhLsIe5zKzNByO99gcnAzvakuwLM4hgVFjK5RUtZhz1ipNESeNNSheammEuawpsUOGrGCv3QIDAQAB` | | Auto |
| MX | `send.mail` | `feedback-smtp.ap-northeast-1.amazonses.com` | 10 | 60 |
| TXT | `send.mail` | `v=spf1 include:amazonses.com ~all` | | 60 |
| CNAME | `rsend.mail` | `send.forge.rmta.net` | | 60 |

Add only these new records. Do not change the existing MX, SPF or TXT records on `webserbisyo.com`
itself; they serve your current email. Then Resend → Domains → `mail.webserbisyo.com` → Verify, and
wait for "Verified". If the values in Resend ever differ from this table, Resend wins.

### 4.2 Resend API key

Resend → API Keys → Create: name `supabase-smtp`, permission "Sending access", domain
`mail.webserbisyo.com`. Copy it straight into step 4.3; Resend shows it once.

### 4.3 Supabase SMTP

Supabase → Authentication → Emails → SMTP Settings → enable custom SMTP:

| Field | Value |
| --- | --- |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | the `supabase-smtp` API key |
| Sender email | `codes@mail.webserbisyo.com` |
| Sender name | `Smart App PH` |

### 4.4 Supabase email templates

Supabase → Authentication → Emails → Templates. For each one, paste the subject and the whole file:

| Template | Subject | File |
| --- | --- | --- |
| Confirm sign up | `Your Smart App PH code` | `supabase/templates/confirmation.html` |
| Magic link | `Your sign-in code` | `supabase/templates/magic_link.html` |
| Reset password | `Reset your password` | `supabase/templates/recovery.html` |
| Change email address | `Confirm your new email` | `supabase/templates/email_change.html` |

### 4.5 Supabase Auth settings

- Authentication → Sign In / Providers → Email: Confirm email on, Email OTP length `6`, Email OTP
  expiration `900` seconds, minimum password length `8`.
- Authentication → Rate Limits: emails sent per hour `100`.

### 4.6 Check

Resend → Emails → send a test from `codes@mail.webserbisyo.com` to your Gmail. It must arrive in the
inbox, not spam. If codes stop arriving later, check Resend → Emails/Logs first, then Supabase → Logs → Auth.
