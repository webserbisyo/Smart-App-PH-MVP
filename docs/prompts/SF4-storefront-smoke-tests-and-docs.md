# SF4 Storefront smoke tests and docs

Track A, storefront v2 prompt 4 of 4. A small Playwright smoke suite that catches layout breakage, then the docs and
repo description brought up to date.

To run it, paste this one line into Antigravity:
`Read @AGENTS.md and @docs/prompts/SF4-storefront-smoke-tests-and-docs.md and do exactly that prompt.`

**Runs after** SF3 is merged into `dev`.

## Read first

`AGENTS.md`, `docs/storefront-v2.md`, `docs/local-dev.md`, `.github/workflows/check.yml`, `docs/PROGRESS.md`,
`docs/CHANGELOG.md`, `README.md`, Playwright's current docs for `@playwright/test` 1.64 (config, projects, `webServer`).

## Goal

Every key page of both demo shops is checked automatically at phone and desktop size for the bugs we had (sideways
scroll, sheets cut off, double scroll, console errors), and the docs describe the storefront as it now is.

Branch: `ag/sf4-smoke-and-docs` from the latest `dev`.

## Build only (one commit per step)

1. **Playwright setup.** Add `@playwright/test` 1.64.1 as a dev dependency of a new workspace package `tooling/e2e`
   (`@smartapp/e2e`; approved, decision SF-4). `playwright.config.ts`: Chromium only; projects `phone` (390 × 844,
   `isMobile`, `hasTouch`) and `desktop` (1280 × 800); `baseURL` http://localhost:3000; `webServer` builds and starts
   the storefront against the local stack; traces on first retry; screenshots saved as test attachments (no pixel
   baselines). Scripts: root `pnpm e2e`, `pnpm e2e:ui`. On the founder's Mac: `pnpm --filter @smartapp/e2e exec
   playwright install chromium` once. Commit `chore(sf4): Playwright smoke setup`.
2. **Smoke specs** (`tooling/e2e/tests/`), run for `juans-cafe` and `tala-apparel` in both projects:
   - Pages: home, menu, `?item=` sheet open, cart open with one item, checkout, a receipt (place a walk-in cash order in
     the test, then open its receipt), orders, rewards, account (signed out), privacy, `/no-such-shop` (404).
   - On every page: `document.documentElement.scrollWidth <= window.innerWidth` (no sideways scroll); no console
     `error` and no page error; the main landmark is visible; the tab bar (phone) or top nav (desktop) is visible.
   - On every open sheet or dialog: its bounding box is inside the viewport; exactly one descendant scrolls
     (`scrollHeight > clientHeight` with `overflow-y` auto or scroll); the close button is visible and works.
   - Shared helpers in `tooling/e2e/helpers.ts` (`expectNoSidewaysScroll`, `expectOverlayInViewport`,
     `expectSingleScroll`, `collectConsoleErrors`).
   - Keep it under 3 minutes locally. No tests per button or per form rule.
   Commit `test(sf4): storefront smoke at 390 and 1280`.
3. **CI.** A job `e2e` in `.github/workflows/check.yml` after `check`: starts the local Supabase stack (as the
   existing database job does), seeds the demo shops, installs Chromium with `playwright install --with-deps
   chromium`, runs `pnpm e2e`, uploads the HTML report as an artifact on failure. Never points at the hosted database.
   Commit `ci(sf4): run the storefront smoke on pull requests`.
4. **Docs.** Bring these to the current state (no history, A-13): `docs/ui-kit.md` (installed parts and new
   patterns), `docs/agent-reference.md` storefront section (shell, palette, breakpoints, push, caching, image import),
   `docs/storefront-v2.md` (mark what shipped; remove anything not built and move it to the backlog),
   `docs/local-dev.md` (`pnpm e2e`, `pnpm demo:media`, HTTPS dev for push), `docs/api-surface.md` (check against the
   code), `README.md` (what the product does today, how to run it, no secrets), `docs/PROGRESS.md` (SF1 to SF4 ticked,
   backlog intact), `docs/CHANGELOG.md`. Commit `docs(sf4): storefront v2 docs`.
5. **Repo description.** Put this text in the PR body for the founder to paste (GitHub, repo page, About ⚙,
   Description), and the topics below it:
   - Description: "Smart App PH: an ordering app and loyalty stamp card for small Philippine shops. Installable
     storefront (pickup, delivery, GCash/Maya proof), owner dashboard, Next.js + Vite + Supabase."
   - Topics: `pwa`, `nextjs`, `supabase`, `loyalty-program`, `ordering-system`, `philippines`.
   Do not change repo settings yourself. Commit nothing for this step.

## Do not build

Visual pixel diffs, tests for every action, dashboard tests, load tests, new features or fixes beyond
what a failing smoke test reveals. If a smoke test finds a real bug, fix it in its own commit `fix(sf4): ...` and say
so; if the fix is large, mark the test `test.fixme` with the reason and list it in the PR (never delete a test).

## Done when

- `pnpm e2e` passes locally for both shops at 390 and 1280; deliberately breaking a sheet (for example removing its max
  height) makes the overlay test fail.
- The CI `e2e` job is green on the PR.
- A new agent can read `docs/ui-kit.md` and `docs/agent-reference.md` and know which part to use for any storefront
  need.
- `pnpm check` and `pnpm build` green.

## Test locally

`pnpm local start`, `pnpm local reset`, `pnpm local demo`, then `pnpm e2e` (it starts the storefront itself); open the
report with `pnpm --filter @smartapp/e2e exec playwright show-report`.

## Finish

Attach the Playwright HTML report summary and the 390/1280 screenshots it saved; tick SF4 in `docs/PROGRESS.md`, one
`docs/CHANGELOG.md` line; push the branch, open a PR into `dev`; never push `dev`, `next` or `main`; reply with the 5
lines and the PR link.
