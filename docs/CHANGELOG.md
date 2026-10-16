# Changelog

One line per merged prompt under "Unreleased". At each release (`dev` into `main`), the founder moves those lines
under the new version and tags it on `main`.

## Unreleased

- docs(sf): storefront v2 spec (`docs/storefront-v2.md`), prompts SF1 to SF4, decisions SF-1 to SF-24, post-launch
  backlog in PROGRESS.
- fix(ui): sheets, drawers and dialogs size to the screen with one scroll area, header and footer pinned, no
  sideways scrollbar (storefront cart was cut off with two scrollbars).
- docs(a0.1): local Supabase in Docker (`pnpm local`, `docs/local-dev.md`), CLI link allowed but never written to,
  api-surface checked against the code, docs trimmed to the current state (decisions A-9 to A-13).
- docs(a0.1): AGENTS.md cut to 73 lines of general rules; area details moved to `docs/agent-reference.md`.
- docs(a0.1): AGENTS.md rulebook for every agent, CLAUDE.md points to it, PROGRESS, CHANGELOG, PR template,
  blueprints A and B in `docs/blueprints/`, new prompt template (agents open PRs, never push `dev`).

## v0.5.0 (2026-10-14, on `dev`, not yet released to `main`)

Everything built for the MVP, P1 to P5.6.

- #21 fix(dashboard): open Waiting right after creating the shop
- #20 feat(p4.7): home, customers, reports
- #19 feat(p5.6): home numbers, reports, customers, CSV, demo_reset
- #18 feat(p4.6): members, stamps, install guide
- #17 feat(p5.5): members, stamps and rewards
- #16 feat(p4.5): orders board, order detail, chime
- #15 feat(p5.4): owner order actions, expiry job, audit log, order rules
- #14 feat(p4.4): checkout, receipt, my orders
- #13 P5.3: order engine, payment proofs, live order updates
- #12 P4.3: storefront home, menu, item sheet, cart
- #11 P5.2: get_storefront, demo shops, per-shop manifest
- #10 P4.2: shop settings
- #9 feat(p4.1): products, categories, product editor
- #8 feat(p5.1): settings and catalog tables, storage, catalog API
- #7 feat(p4.0): kit additions, shared patterns, core order rules
- #6 P3b: owner auth, shop setup, guards, customer email sign-in
- #5 P3a: shops, owners and settings with RLS and database tests
- #4 Backend prompts: revised P3a/P3b, new P5.1-P5.6, API surface
- #3 docs(p4): UX plan and P4.0 to P4.7 checkpoint prompts
- #2 dev into main: P1 monorepo and rules, P2 stack and deploy setup, P2.6 Resend email (the state of `main` today)
- #1 P2 and P3 checkpoint prompts
