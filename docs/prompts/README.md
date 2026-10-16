# Checkpoint prompts: run order

One prompt per checkpoint. Paste its one line into Antigravity (or a fresh Claude Code session):
`Read @AGENTS.md and @docs/prompts/<file>.md and do exactly that prompt.` The agent opens a pull request into `dev`;
you test the "Done when" list and merge it, then start the next one. Agents never push `dev` themselves (decision
A-2). Run each checkpoint in one place only. From 2026-10-14 new prompts follow the blueprints in `docs/blueprints/`
and the template in `docs/build-plan.md`; the table below is the finished P1 to P5.6 history.

| # | Prompt | What you get | Screens? |
| --- | --- | --- | --- |
| P1 | `P1-repo-and-folder-rules.md` | repo, rules, contracts | done |
| P2 | `P2-foundations.md` | stack, look, layouts, deploy | done |
| P2.6 | `P2.6-resend-email.md` | email codes through Resend | done |
| P3a | `P3a-shops-database-and-rls.md` | shops, owners, settings tables + security tests | no |
| P3b | `P3b-auth-and-guards.md` | owner sign-up/login, shop setup, approval, guards, customer sign-in | auth pages only |
| P4.0 | `P4.0-kit-and-shared-patterns.md` | shared building blocks on `/kit` (screens thread) | parts only |
| P5.1 | `P5.1-settings-catalog-storage.md` | settings + catalog tables, photo storage, catalog API | no |
| P4.1, P4.2 | `P4.1-products-and-categories.md`, `P4.2-shop-settings.md` | dashboard Products and Settings on real data | yes |
| P5.2 | `P5.2-storefront-read-and-demo-shops.md` | real shop pages, demo shops, install per shop | no |
| P4.3 | `P4.3-storefront-browse.md` | storefront home, menu, item sheet, cart | yes |
| P5.3 | `P5.3-order-engine.md` | prices, orders, payment proofs, live receipt | no |
| P4.4 | `P4.4-checkout-and-receipt.md` | checkout + receipt | yes |
| P5.4 | `P5.4-owner-order-handling.md` | verify, mark paid, next step, cancel, expiry, chime events | no |
| P4.5 | `P4.5-orders-board-and-detail.md` | orders board + order detail | yes |
| P5.5 | `P5.5-members-and-stamps.md` | members, stamps, rewards | no |
| P4.6 | `P4.6-members-and-stamps.md` | member sign-in, member card, my orders | yes |
| P5.6 | `P5.6-home-reports-and-demo-reset.md` | Home numbers, reports, CSV, `demo_reset` | no |
| P4.7 | `P4.7-home-customers-reports.md` | dashboard Home, Customers, Reports | yes |
| P6 | replaced by Track A in `docs/blueprints/` and storefront v2 below | | |

No mock data: each P4 step builds on the real API from the P5 step before it. The names every screen may call are
in `docs/api-surface.md`.

## Storefront v2 (Track A, from 2026-10-16)

Run in this order, one at a time, each merged before the next. Spec: `docs/storefront-v2.md`. They replace
Blueprint A pages A1 to A12 (decision SF-1).

| # | Prompt | What you get | Database? |
| --- | --- | --- | --- |
| SF1 | `SF1-storefront-foundation-redesign.md` | new shell, 60/30/10 palette, every storefront page redesigned, 404/error/privacy pages, shop icons and splash, brand editor | no |
| SF2 | `SF2-storefront-database.md` | reward kinds, banners, announcement, about, order messages, delivery info, ratings, push tables | yes (additive; the merge deploys it live) |
| SF3 | `SF3-storefront-features-and-demo-content.md` | those features on screen, push, offline page, SEO, cached pages, real demo photos | demo functions only |
| SF4 | `SF4-storefront-smoke-tests-and-docs.md` | Playwright smoke at 390 and 1280, CI job, docs, repo description | no |

SF1 starts only after the "Fix cut-off sheets and double scroll" PR is merged.

## Moved to P6 (approved by the founder 2026-10-11, `docs/decisions.md` P5-6 and P5-15)

- Cloudflare Turnstile on checkout (until then: per-phone and per-shop limits in the database).
- Deleting payment proofs after 30 days (needs an Edge Function or a scheduled script; Supabase blocks deleting
  storage files from SQL).
- Caching shop pages, per-shop icons generated from the logo, offline page.

## After P5.6: the acceptance run

System paper section 13, all ten tests on a real phone, against the real database, with Juan's Cafe and Tala
Apparel. Test 9 (one shop cannot see another's data) is also proven by the database tests on every pull request.
