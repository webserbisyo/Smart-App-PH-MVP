<!-- One prompt, one branch, one PR. Base: dev (Track A) or next (Track B). Never main. -->

## Prompt

ID and file: <!-- e.g. A2, docs/prompts/A2-shop-home.md -->
Track: <!-- A (dev) or B (next) -->

## What changed

<!-- 2 to 5 lines a non-developer can read. -->

## How to test

<!-- Exact URLs (localhost or the Vercel preview), which demo shop, what to tap, what you should see. -->

## Screenshots

| Page | 390 px (phone) | 1280 px (desktop) |
| --- | --- | --- |
| | | |

<!-- Dashboard: also dark mode at 1280. Boards: also 768. No real customer data in screenshots. -->

## Checks

- [ ] `pnpm check` green
- [ ] `pnpm build` green
- [ ] Every state seen: loading, empty, error, offline, data (plus closed shop / long text / big amounts where they apply)
- [ ] 0 console errors and 0 React warnings on the changed pages
- [ ] Tested with `juans-cafe` and `tala-apparel`
- [ ] No new package, or the founder approved it (name and version below)
- [ ] Database: no migration, or a new migration file with RLS and grants, pgTAP test, `pnpm db:types` committed
- [ ] `docs/PROGRESS.md` ticked and one `docs/CHANGELOG.md` line added
- [ ] No `.env*`, keys or tokens in the diff

## Decisions and open items

<!-- What you decided on your own, what is missing (API, words, assets), what the founder must do by hand. -->
