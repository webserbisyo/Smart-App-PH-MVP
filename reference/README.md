# reference/ (read-only, never imported)

Copy-and-trim source from the first build, `webserbisyo/Smart-App-PH`, branch `redesign/v3-home`
at commit `dff6bf9` (its newest branch). Files keep their old paths. This folder is excluded from
TypeScript, ESLint, Vitest and Turbo. When a checkpoint needs one of these, copy the parts it needs
into the right package and trim them to the v1.1 names (the system paper wins where they differ:
the old code has POS, staff, dine-in, shipping and vouchers that the MVP does not).

| File | What it is | Used in |
| --- | --- | --- |
| `packages/ui/src/styles/tokens.css` | Design tokens: navy, blue, marigold, member green, greys, light and dark | P2.2 (look and tokens) |
| `packages/core/src/money.ts` | Centavos helpers and peso formatting | P4.1 (first screens with prices) |
| `packages/core/src/commerce/time.ts` | Manila time helpers: business date, weekday, add days | P4.1 (open status), P5.2 |
| `packages/core/src/commerce/status.ts` | Order rules: `nextActions`, board columns, status labels and tones | P4.4 (orders board) |
| `packages/core/src/commerce/order.ts` | Order shapes and `splitOpenOrders` (in progress vs late) | P4.4 (orders board), P4.6 (home list) |
| `packages/ui/src/lib/crop-image.ts` | Browser image compression to WebP (1600 px), crop | P4.5 (product photos), P4.2 (payment proof) |
| `packages/ui/src/patterns/uploads/queue.tsx` | Upload queue hook: pick, compress, upload with progress, retry | P4.5, P4.7 (logo, cover, QR) |
| `supabase/migrations/20261004151400_order_idempotency.sql` | Order engine: `build_order` and `place_order` with client key retries (latest version) | P5.3 (order engine) |
| `supabase/migrations/20261004145146_db_v1_fixups.sql` | `submit_payment_proof` and `review_payment` (latest versions), plus older `build_order`/`advance_order` | P5.3, P5.4 |
| `supabase/migrations/20261011150000_prep_can_start.sql` | `advance_order` (latest version) | P5.4 (owner order handling) |
| `apps/dashboard/src/app/module.ts` | Dashboard module type (`defineAppModule`) | P2.3 (dashboard layout and registry) |
| `apps/dashboard/src/app/registry.ts` | Module registry: one line per feature, lazy screens | P2.3 |
| `packages/core/src/modules.ts` | Module definition and nav building used by the registry | P2.3 |
| `apps/dashboard/src/app/shell/ShellFrame.tsx` | Dashboard shell frame: sidebar, top bar, bottom bar | P2.3 |
| `apps/dashboard/src/app/shell/TenantShell.tsx` | Shell for a signed-in owner's shop | P2.3, P3.4 (guards) |
| `packages/ui/src/patterns/AppShell.tsx` | Shared layout pattern behind the shell | P2.3 |
