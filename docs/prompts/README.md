# Checkpoint prompts: run order

One prompt per checkpoint. Paste its one line into a fresh Claude Code session, test the "Done when" list, merge
the pull request into `dev`, then start the next one. Run each checkpoint in one place only.

| # | Prompt | What you get | Screens? |
| --- | --- | --- | --- |
| P1 | `P1-repo-and-folder-rules.md` | repo, rules, contracts | done |
| P2 | `P2-foundations.md` | stack, look, layouts, deploy | done |
| P2.6 | `P2.6-resend-email.md` | email codes through Resend | done |
| P3a | `P3a-shops-database-and-rls.md` | shops, owners, settings tables + security tests | no |
| P3b | `P3b-auth-and-guards.md` | owner sign-up/login, shop setup, approval, guards, customer sign-in | auth pages only |
| P5.1 | `P5.1-settings-catalog-storage.md` | settings + catalog tables, photo storage, catalog API | no |
| P4.1 | (screens thread) | dashboard Settings + Products on real data | yes |
| P5.2 | `P5.2-storefront-read-and-demo-shops.md` | real shop pages, demo shops, install per shop | no |
| P4.2 | (screens thread) | storefront home, menu, item sheet, cart | yes |
| P5.3 | `P5.3-order-engine.md` | prices, orders, payment proofs, live receipt | no |
| P4.3 | (screens thread) | checkout + receipt | yes |
| P5.4 | `P5.4-owner-order-handling.md` | verify, mark paid, next step, cancel, expiry, chime events | no |
| P4.4 | (screens thread) | orders board + order detail | yes |
| P5.5 | `P5.5-members-and-stamps.md` | members, stamps, rewards | no |
| P4.5 | (screens thread) | member sign-in, member card, my orders | yes |
| P5.6 | `P5.6-home-reports-and-demo-reset.md` | Home numbers, reports, CSV, `demo_reset` | no |
| P4.6 | (screens thread) | dashboard Home, Customers, Reports | yes |
| P6 | later | speed, PWA polish, production, launch | |

No mock data: each P4 step builds on the real API from the P5 step before it. The names every screen may call are
in `docs/api-surface.md`.

## Moved to P6 (decided 2026-10-11)

- Cloudflare Turnstile on checkout (until then: per-phone and per-shop limits in the database).
- Deleting payment proofs after 30 days (needs an Edge Function or a scheduled script; Supabase blocks deleting
  storage files from SQL).
- Caching shop pages, per-shop icons generated from the logo, offline page.

## After P5.6: the acceptance run

System paper section 13, all ten tests on a real phone, against the real database, with Juan's Cafe and Tala
Apparel. Test 9 (one shop cannot see another's data) is also proven by the database tests on every pull request.
