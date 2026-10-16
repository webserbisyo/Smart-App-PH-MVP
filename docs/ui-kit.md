# UI kit

What is installed in `packages/ui`, when to use each part, and the rules. Exact versions: `docs/stack-versions.md`.

## Installed libraries

| Library | What we use it for | Where |
| --- | --- | --- |
| shadcn/ui, Base UI flavour (`base-nova`) | every basic component, carousel | `packages/ui/src/components` |
| ReUI (`@reui`) | data grid, timeline, use-file-upload hook | same, `packages/ui/src/hooks` |
| DiceUI (`@diceui`) | sortable, cropper, banner, mask input, colour picker, responsive dialog, stat, status, scroller, qr code | `packages/ui/src/components` |
| Magic UI (`@magicui`) | confetti, number ticker, dot pattern, shine border | same |
| Tabler icons (`@tabler/icons-react`) | every icon | re-exported from `@smartapp/ui/icons` |
| Plus Jakarta Sans (`@fontsource-variable/plus-jakarta-sans`) | the only font, self-hosted | `packages/ui` styles |
| Recharts | through shadcn `chart`, lazy-loaded | `packages/ui/src/components/chart` |
| Fluent Emoji 3D (Microsoft, MIT) | category icons: curated WebP files, typed list `FLUENT_ICONS` | `packages/ui/src/assets/fluent` |

Kit components are source files we own once installed.

## Rules

- Reuse in this order: a pattern in `packages/ui/src/patterns`, then a kit component in `packages/ui/src/components`,
  then (only if neither fits) a new pattern built from kit parts.
- Kit components are installed as source with `pnpm dlx shadcn@4.21.4 add <name>` run inside `packages/ui`
  (registries `@reui`, `@diceui`, `@magicui` are set in `components.json`). Do not hand-write or heavily edit them;
  fix only what lint needs (no casts, no `any`). Adding a component the screen needs is fine; say so in the PR.
- Icons: Tabler only, through `@smartapp/ui/icons` (filled variant for the selected nav item).
- Category icons: Fluent 3D (default, picked from a searchable grid), an emoji, or an uploaded photo (256 px WebP).
  Stored as `Category.icon` (`fluent` key, `emoji` value or `image` path) and drawn by `CategoryIcon`.
- Colours, radius, motion: tokens in `packages/ui/src/styles/tokens.css` only. Font: Plus Jakarta Sans (self-hosted).
- Charts: shadcn `chart` (Recharts), lazy-loaded.
- Cloud sessions get 403 from the component registries; allow `ui.shadcn.com`, `reui.io`, `diceui.com`,
  `magicui.design` in the environment's network settings before running `shadcn add` there.

## Kit components

| Need | Use |
| --- | --- |
| Buttons, inputs, forms | button, button-group, toggle, input, label, field, input-group, textarea, input-otp (6-digit codes), select, native-select (long lists on phones), radio-group, checkbox, switch, toggle-group, DiceUI mask-input (phone, reference numbers), DiceUI color-picker |
| Layout and lists | card, item (list rows), separator, scroll-area, tabs, collapsible, table, ReUI data-grid (sort, search, filters, CSV), DiceUI scroller (horizontal tabs and columns) |
| Overlays | DiceUI responsive-dialog (drawer on phones, dialog on desktop; default for create/edit), sheet, drawer, dialog, alert-dialog (confirm), dropdown-menu, popover, tooltip |
| Feedback | sonner (toasts), alert, skeleton, spinner, empty, progress, badge, DiceUI banner, DiceUI status (live dots) |
| Navigation | sidebar (desktop sidebar and tablet rail), breadcrumb |
| Data and media | DiceUI stat (number tiles), chart, calendar, avatar, ReUI timeline, DiceUI sortable (drag to reorder), ReUI use-file-upload, DiceUI cropper, DiceUI qr-code, shadcn carousel |
| Celebration and visuals | Magic UI confetti (reward reached only), Magic UI number-ticker (Home sales only), Magic UI dot-pattern, Magic UI shine-border |

Blocks in `packages/ui/src/blocks` (sidebar, login, sign-up, donut chart) are starting points, already trimmed.

## Patterns (ours, `packages/ui/src/patterns`)

| Pattern | Use for |
| --- | --- |
| `AppShell`, `TopBar`, `PageBody`, `BottomDock` | dashboard frame; `PageBody` widths: full 1600, wide 1280, settings 880, form 720, narrow 480 |
| `StoreTabBar`, `CartBar`, `ShopHeader` | storefront frame and shop header |
| `QueryState`, `EmptyPage`, `OfflineBanner` | loading, empty, error and offline states on every page |
| `StickyActionBar` | the main action on forms and checkout, above the keyboard |
| `Money`, `PesoField`, `PhoneField`, `CodeInput`, `QuantityStepper`, `PhotoField` | money, phone, codes, quantities, photos (with compression) |
| `StatusBadge` | order and payment status: icon, word and colour from `STATUS_LOOK` |
| `OrderCard`, `OrderLines`, `OrderTimeline` | orders board, cart, receipt, order detail |
| `ProductCard`, `CategoryIcon` | storefront grids, category chips, product fallbacks |
| `StampCard` | member card, receipt join prompt, customer detail |
| `SettingsSection`, `ShareShop`, `CopyButton`, `MoreMenu`, `SalesBars` | settings pages, sharing the shop, copy actions, overflow menus, small sales chart |

## Responsive layout

| Width | Dashboard | Storefront |
| --- | --- | --- |
| Phone < 768 px | bottom dock (Home, Orders, Products, Customers, More) | bottom tabs (Home, Menu/Products, Orders, Account) with the cart bar above |
| Tablet 768 to 1023 px | 72 px icon rail | bottom tabs |
| Laptop 1024 px and up | 248 px sidebar, collapsible to the rail | top navigation, cart drawer on the right |

One nav per device. Breakpoints by width; touch sizes by pointer (`pointer: coarse`: 44 px targets, 16 px inputs).

## Phone feel (both apps)

`viewport-fit=cover` with safe-area padding under bars; `100dvh`; `inputmode` and `autocomplete` on phone, email,
code and money fields; hide the dock while the keyboard is open; bottom sheets instead of centred dialogs on phones;
press states, hover only under `@media (hover: hover)`; `overscroll-behavior: contain` in sheets; skeletons in the
shape of the content; optimistic buttons.

## Add when a screen needs it (not installed)

shadcn: accordion, aspect-ratio, carousel, command, context-menu, hover-card, kbd, menubar, navigation-menu,
pagination, resizable, slider. ReUI/DiceUI: kanban, tags-input, combobox. No stepper (checkout is one page).
