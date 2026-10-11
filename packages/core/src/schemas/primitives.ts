import { z } from 'zod';

/** Money in whole centavos: ₱120.00 is 12000. Never decimals, never negative. */
export const Centavos = z.int().nonnegative();
export type Centavos = z.infer<typeof Centavos>;

export const Uuid = z.uuid();
export type Uuid = z.infer<typeof Uuid>;

/**
 * Link names a shop cannot take: app routes, platform words and short paths. Mirrored by
 * `private.is_reserved_slug` in the first migration (a test keeps the two lists equal).
 */
export const RESERVED_SLUGS = [
  'app', 'api', 'admin', 'www', 'mail', 'auth', 'login', 'signup', 'account', 'orders', 'cart', 'checkout',
  'menu', 'o', 'i', 's', 'static', 'assets', '_next', 'manifest', 'sw', 'favicon', 'robots', 'sitemap',
  'privacy', 'terms', 'about', 'pricing', 'help', 'support', 'status', 'dashboard', 'demo', 'shop', 'shops',
] as const;

const reserved: ReadonlySet<string> = new Set(RESERVED_SLUGS);

/** A shop's link name, for example `juans-cafe`. */
export const Slug = z
  .string()
  .min(3)
  .max(40)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, digits and single hyphens.')
  .refine((value) => !reserved.has(value), 'This link name is reserved. Try another.');
export type Slug = z.infer<typeof Slug>;

/** Philippine mobile number in international form: `+639` and 9 digits. */
export const PhPhone = z.string().regex(/^\+639\d{9}$/, 'Use the +639XXXXXXXXX format.');
export type PhPhone = z.infer<typeof PhPhone>;

/** A moment in time, ISO 8601 with an offset (stored in UTC). */
export const IsoDateTime = z.iso.datetime({ offset: true });
export type IsoDateTime = z.infer<typeof IsoDateTime>;

/** A calendar date in Manila time, `YYYY-MM-DD` (the order's business date). */
export const ManilaDate = z.iso.date();
export type ManilaDate = z.infer<typeof ManilaDate>;

/** A colour as `#RRGGBB`, used for the shop's 60/30/10 colours. */
export const HexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a #RRGGBB colour.');
export type HexColor = z.infer<typeof HexColor>;
