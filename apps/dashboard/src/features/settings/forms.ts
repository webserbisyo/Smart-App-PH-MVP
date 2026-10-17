import { z } from 'zod';

import { Centavos, HexColor, Pin, RewardKind, rewardLabel, TimeOfDay, TransferMethod, Uuid, WORDS } from '@smartapp/core';
import type {
  BusinessHours,
  CatalogItem,
  DayHours,
  DeliveryZone,
  DeliveryZoneDraft,
  PaymentAccount,
  PaymentAccountDraft,
  RewardRule,
  ShopSettings,
  ShopSettingsPatch,
  StampRule,
  Tenant,
} from '@smartapp/core';

// The settings pages' forms: what the owner types, checked here, and the patches packages/api saves.

const words = WORDS.dashboard.settings;

/** Shown for a day that is switched on for the first time. */
export const DEFAULT_OPENS = '08:00';
export const DEFAULT_CLOSES = '20:00';

// --- shop look -------------------------------------------------------------------------------------

export const LookForm = z.object({
  name: z.string().trim().min(1).max(80),
  tagline: z.string().max(160),
  logoPath: z.string().min(1).nullable(),
  coverPath: z.string().min(1).nullable(),
  primary: HexColor,
  secondary: HexColor,
  accent: HexColor,
});
export type LookForm = z.infer<typeof LookForm>;

export function lookFromShop(tenant: Tenant, settings: ShopSettings): LookForm {
  return {
    name: tenant.name,
    tagline: settings.tagline ?? '',
    logoPath: settings.logoPath,
    coverPath: settings.coverPath,
    primary: settings.colorPrimary.toUpperCase(),
    secondary: settings.colorSecondary.toUpperCase(),
    accent: settings.colorAccent.toUpperCase(),
  };
}

export function lookPatch(form: LookForm): ShopSettingsPatch {
  const tagline = form.tagline.trim();
  return {
    tagline: tagline === '' ? null : tagline,
    logoPath: form.logoPath,
    coverPath: form.coverPath,
    colorPrimary: form.primary.toUpperCase(),
    colorSecondary: form.secondary.toUpperCase(),
    colorAccent: form.accent.toUpperCase(),
  };
}

// --- business info ---------------------------------------------------------------------------------

/** "facebook.com/juanscafe", "fb.com/juanscafe" or a full link → `https://www.facebook.com/juanscafe`; `null` when empty. */
export function facebookUrl(text: string): string | null | undefined {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const match = /^(?:https?:\/\/)?(?:(?:www|m|web)\.)?(?:facebook|fb)\.com\/([A-Za-z0-9.\-_/?=&]+)$/i.exec(trimmed);
  return match?.[1] ? `https://www.facebook.com/${match[1]}` : undefined;
}

/** "juanscafe", "m.me/juanscafe" or a full m.me link → `juanscafe`; `null` when empty, `undefined` when invalid. */
export function messengerUsername(text: string): string | null | undefined {
  const trimmed = text.trim().replace(/^(?:https?:\/\/)?(?:www\.)?m\.me\//i, '').replace(/\/$/, '');
  if (trimmed === '') return null;
  return /^[A-Za-z0-9.]{1,50}$/.test(trimmed) ? trimmed : undefined;
}

export const InfoForm = z
  .object({
    /** `+639…`, or null while empty (PhoneField). */
    phone: z.string().nullable(),
    address: z.string().max(200),
    facebook: z.string().max(200),
    messenger: z.string().max(80),
    pin: Pin.nullable().optional(),
  })
  .superRefine((form, ctx) => {
    if (facebookUrl(form.facebook) === undefined) ctx.addIssue({ code: 'custom', path: ['facebook'], message: words.info.facebookInvalid });
    if (messengerUsername(form.messenger) === undefined) ctx.addIssue({ code: 'custom', path: ['messenger'], message: words.info.messengerInvalid });
  });
export type InfoForm = z.infer<typeof InfoForm>;

export function infoFromSettings(settings: ShopSettings): InfoForm {
  return {
    phone: settings.phone,
    address: settings.address ?? '',
    facebook: settings.facebookUrl ?? '',
    messenger: settings.messengerUsername ?? '',
    pin:
      settings.pin ??
      (settings.shopLat !== null &&
      settings.shopLat !== undefined &&
      settings.shopLng !== null &&
      settings.shopLng !== undefined
        ? { lat: settings.shopLat, lng: settings.shopLng }
        : null),
  };
}

export function infoPatch(form: InfoForm): ShopSettingsPatch {
  const address = form.address.trim();
  return {
    phone: form.phone,
    address: address === '' ? null : address,
    facebookUrl: facebookUrl(form.facebook) ?? null,
    messengerUsername: messengerUsername(form.messenger) ?? null,
    ...(form.pin !== undefined ? { pin: form.pin } : {}),
  };
}

// --- hours -----------------------------------------------------------------------------------------

const DayForm = z.object({
  weekday: z.int().min(0).max(6),
  open: z.boolean(),
  opensAt: TimeOfDay,
  closesAt: TimeOfDay,
});
export type DayForm = z.infer<typeof DayForm>;

export const HoursForm = z
  .object({
    days: z.array(DayForm).length(7),
    /** `YYYY-MM-DD`, Manila dates. */
    closedDays: z.array(z.iso.date()),
    paused: z.boolean(),
  })
  .superRefine((form, ctx) => {
    form.days.forEach((day, index) => {
      if (day.open && day.opensAt === day.closesAt) ctx.addIssue({ code: 'custom', path: ['days', index, 'closesAt'], message: words.hours.sameTime });
    });
  });
export type HoursForm = z.infer<typeof HoursForm>;

/** Seven rows, Sunday first; a weekday without saved hours is off (with the default times ready). */
export function hoursFromData(hours: readonly BusinessHours[], closures: readonly { closedOn: string }[], settings: ShopSettings): HoursForm {
  return {
    days: Array.from({ length: 7 }, (_, weekday) => {
      const saved = hours.find((day) => day.weekday === weekday);
      return { weekday, open: saved !== undefined, opensAt: saved?.opensAt ?? DEFAULT_OPENS, closesAt: saved?.closesAt ?? DEFAULT_CLOSES };
    }),
    closedDays: closures.map((closure) => closure.closedOn).sort(),
    paused: !settings.acceptingOrders,
  };
}

/** The days that are on, for `saveBusinessHours` (every other day becomes closed). */
export function weekFromForm(form: HoursForm): DayHours[] {
  return form.days.filter((day) => day.open).map((day) => ({ weekday: day.weekday, opensAt: day.opensAt, closesAt: day.closesAt }));
}

/** Closed days to add and to remove. */
export function closureChanges(before: readonly string[], after: readonly string[]): { add: string[]; remove: string[] } {
  const was = new Set(before);
  const now = new Set(after);
  return { add: [...now].filter((date) => !was.has(date)).sort(), remove: [...was].filter((date) => !now.has(date)).sort() };
}

/** A local calendar date (what the date picker hands back) as `YYYY-MM-DD`. */
export function dateKey(date: Date): string {
  return `${String(date.getFullYear())}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** `YYYY-MM-DD` as a local calendar date for the date picker. */
export function dateFromKey(key: string): Date {
  const [year = 1970, month = 1, day = 1] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// --- order types and delivery areas ----------------------------------------------------------------

const ZoneForm = z.object({
  id: Uuid.nullable(),
  name: z.string().max(60),
  fee: Centavos.nullable(),
  etaText: z.string().nullable(),
  isActive: z.boolean(),
  center: Pin.nullable().optional(),
});
export type ZoneForm = z.infer<typeof ZoneForm>;

export const OrderTypesForm = z
  .object({
    walkIn: z.boolean(),
    pickup: z.boolean(),
    delivery: z.boolean(),
    payLaterPickup: z.boolean(),
    cod: z.boolean(),
    viaMessenger: z.boolean(),
    zones: z.array(ZoneForm),
  })
  .superRefine((form, ctx) => {
    if (!form.walkIn && !form.pickup && !form.delivery) ctx.addIssue({ code: 'custom', path: ['walkIn'], message: words.orderTypes.oneNeeded });
    if (form.delivery && !form.viaMessenger && form.zones.length === 0) ctx.addIssue({ code: 'custom', path: ['zones'], message: words.orderTypes.zoneNeeded });
    form.zones.forEach((zone, index) => {
      if (zone.name.trim() === '') ctx.addIssue({ code: 'custom', path: ['zones', index, 'name'], message: words.orderTypes.zoneNameNeeded });
      if (zone.fee === null) ctx.addIssue({ code: 'custom', path: ['zones', index, 'fee'], message: words.orderTypes.zoneFeeNeeded });
    });
  });
export type OrderTypesForm = z.infer<typeof OrderTypesForm>;

export function emptyZone(): ZoneForm {
  return { id: null, name: '', fee: null, etaText: null, isActive: true, center: null };
}

export function orderTypesFromData(settings: ShopSettings, zones: readonly DeliveryZone[]): OrderTypesForm {
  return {
    walkIn: settings.walkInEnabled,
    pickup: settings.pickupEnabled,
    delivery: settings.deliveryEnabled,
    payLaterPickup: settings.payLaterPickup,
    cod: settings.codEnabled,
    viaMessenger: settings.deliveryFeeViaMessenger,
    zones: zones.map((zone) => ({
      id: zone.id,
      name: zone.name,
      fee: zone.fee,
      etaText: zone.etaText,
      isActive: zone.isActive,
      center:
        zone.center ??
        (zone.centerLat !== null &&
        zone.centerLat !== undefined &&
        zone.centerLng !== null &&
        zone.centerLng !== undefined
          ? { lat: zone.centerLat, lng: zone.centerLng }
          : null),
    })),
  };
}

/** Pay-later switches only count while their order type is on. */
export function orderTypesPatch(form: OrderTypesForm): ShopSettingsPatch {
  return {
    walkInEnabled: form.walkIn,
    pickupEnabled: form.pickup,
    deliveryEnabled: form.delivery,
    payLaterPickup: form.pickup && form.payLaterPickup,
    codEnabled: form.delivery && form.cod,
    deliveryFeeViaMessenger: form.viaMessenger,
  };
}

/** Areas to delete (by id) and areas to save (new or changed), in the form's order. */
export function zoneChanges(before: readonly DeliveryZone[], zones: readonly ZoneForm[]): { remove: string[]; save: { index: number; draft: DeliveryZoneDraft }[] } {
  const kept = new Set(zones.flatMap((zone) => (zone.id === null ? [] : [zone.id])));
  const save = zones.flatMap((zone, index) => {
    const draft: DeliveryZoneDraft = {
      id: zone.id,
      name: zone.name.trim(),
      fee: zone.fee ?? 0,
      etaText: zone.etaText,
      isActive: zone.isActive,
      center: zone.center ?? null,
    };
    const old = zone.id === null ? undefined : before.find((candidate) => candidate.id === zone.id);
    const oldCenter =
      old !== undefined
        ? old.center ??
          (old.centerLat !== null &&
          old.centerLat !== undefined &&
          old.centerLng !== null &&
          old.centerLng !== undefined
            ? { lat: old.centerLat, lng: old.centerLng }
            : null)
        : null;
    const newCenter = draft.center ?? null;
    const centerChanged = oldCenter?.lat !== newCenter?.lat || oldCenter?.lng !== newCenter?.lng;
    const changed = !old || old.name !== draft.name || old.fee !== draft.fee || old.etaText !== draft.etaText || old.isActive !== draft.isActive || centerChanged;
    return changed ? [{ index, draft }] : [];
  });
  return { remove: before.filter((zone) => !kept.has(zone.id)).map((zone) => zone.id), save };
}

// --- payment accounts ------------------------------------------------------------------------------

export const PaymentForm = z
  .object({
    method: TransferMethod,
    bankName: z.string().max(60),
    accountName: z.string().max(80),
    accountNumber: z.string().max(40),
    qrPath: z.string().min(1).nullable(),
    isActive: z.boolean(),
  })
  .superRefine((form, ctx) => {
    const required = words.payments.required;
    if (form.method === 'bank' && form.bankName.trim() === '') ctx.addIssue({ code: 'custom', path: ['bankName'], message: required });
    if (form.accountName.trim() === '') ctx.addIssue({ code: 'custom', path: ['accountName'], message: required });
    if (form.accountNumber.trim() === '') ctx.addIssue({ code: 'custom', path: ['accountNumber'], message: required });
  });
export type PaymentForm = z.infer<typeof PaymentForm>;

export function paymentFromAccount(account: PaymentAccount | null): PaymentForm {
  return {
    method: account?.method ?? 'gcash',
    bankName: account?.bankName ?? '',
    accountName: account?.accountName ?? '',
    accountNumber: account?.accountNumber ?? '',
    qrPath: account?.qrPath ?? null,
    isActive: account?.isActive ?? true,
  };
}

/** The bank name only counts for a bank account. */
export function paymentDraft(id: string | null, form: PaymentForm): PaymentAccountDraft {
  return {
    id,
    method: form.method,
    bankName: form.method === 'bank' ? form.bankName.trim() : null,
    accountName: form.accountName.trim(),
    accountNumber: form.accountNumber.trim(),
    qrPath: form.qrPath,
    isActive: form.isActive,
  };
}

// --- stamp card ------------------------------------------------------------------------------------

export const StampsForm = z
  .object({
    isActive: z.boolean(),
    /** Typed text, so a half-typed number can be shown; checked as 1 to 50. */
    stampsNeeded: z
      .string()
      .refine(
        (text) => /^\d{1,2}$/.test(text.trim()) && Number(text) >= 1 && Number(text) <= 50,
        words.stamps.stampsInvalid,
      ),
    /** Centavos; empty is no minimum. */
    minOrderTotal: Centavos.nullable(),
    rewardKind: RewardKind,
    /** Centavos, at least ₱1 for discount rewards. */
    rewardAmount: Centavos.nullable(),
    rewardItemId: Uuid.nullable(),
    rewardVariantId: Uuid.nullable(),
    rewardTitle: z.string().max(60),
    rewardDescription: z.string().max(200),
    rewardImagePath: z.string().nullable(),
    showMemberCount: z.boolean(),
  })
  .superRefine((form, ctx) => {
    if (form.rewardKind === 'discount') {
      if (form.rewardAmount === null || form.rewardAmount < 100) {
        ctx.addIssue({ code: 'custom', path: ['rewardAmount'], message: words.stamps.rewardNeeded });
      }
    } else if (form.rewardKind === 'free_item') {
      if (!form.rewardItemId) {
        ctx.addIssue({ code: 'custom', path: ['rewardItemId'], message: words.stamps.rewardItemNeeded });
      }
      if (!form.rewardVariantId) {
        ctx.addIssue({ code: 'custom', path: ['rewardVariantId'], message: words.stamps.rewardItemNeeded });
      }
    } else {
      if (!form.rewardTitle || form.rewardTitle.trim() === '') {
        ctx.addIssue({ code: 'custom', path: ['rewardTitle'], message: words.stamps.rewardTitleNeeded });
      }
    }
  });
export type StampsForm = z.infer<typeof StampsForm>;

export function stampsFromData(rule: RewardRule | StampRule, settings: ShopSettings): StampsForm {
  const kind = 'rewardKind' in rule ? rule.rewardKind : 'discount';
  return {
    isActive: rule.isActive,
    stampsNeeded: String(rule.stampsNeeded),
    minOrderTotal: rule.minOrderTotal,
    rewardKind: kind,
    rewardAmount: rule.rewardAmount,
    rewardItemId: ('rewardItemId' in rule ? rule.rewardItemId : null) ?? null,
    rewardVariantId: ('rewardVariantId' in rule ? rule.rewardVariantId : null) ?? null,
    rewardTitle: 'rewardTitle' in rule && rule.rewardTitle ? rule.rewardTitle : '',
    rewardDescription: 'rewardDescription' in rule && rule.rewardDescription ? rule.rewardDescription : '',
    rewardImagePath: ('rewardImagePath' in rule ? rule.rewardImagePath : null) ?? null,
    showMemberCount: settings.showMemberCount,
  };
}

/** The stamp card row to save; derives label and amounts based on reward kind. */
export function stampRuleFromForm(tenantId: string, form: StampsForm, items?: readonly CatalogItem[]): RewardRule {
  const kind = form.rewardKind;
  let rewardAmount = form.rewardAmount ?? 0;
  let rewardLabelText = '';

  if (kind === 'discount') {
    rewardAmount = form.rewardAmount ?? 0;
    rewardLabelText = rewardLabel(rewardAmount);
  } else if (kind === 'free_item') {
    const item = items?.find((i) => i.id === form.rewardItemId);
    const variant = item?.variants.find((v) => v.id === form.rewardVariantId);
    if (variant && item) {
      rewardAmount = variant.price;
      const isOnlyVariant = item.variants.length === 1 || variant.name === 'Standard' || variant.name === 'Default';
      rewardLabelText = isOnlyVariant ? `Free ${item.name}` : `Free ${item.name} (${variant.name})`;
    } else {
      rewardAmount = form.rewardAmount ?? 0;
      rewardLabelText = 'Free item';
    }
  } else {
    rewardAmount = 0;
    rewardLabelText = form.rewardTitle.trim();
  }

  return {
    tenantId,
    isActive: form.isActive,
    stampsNeeded: Number(form.stampsNeeded.trim()),
    minOrderTotal: form.minOrderTotal ?? 0,
    rewardKind: kind,
    rewardLabel: rewardLabelText,
    rewardAmount,
    rewardItemId: kind === 'free_item' ? form.rewardItemId : null,
    rewardVariantId: kind === 'free_item' ? form.rewardVariantId : null,
    rewardTitle: kind === 'custom' ? form.rewardTitle.trim() : null,
    rewardDescription: kind === 'custom' && form.rewardDescription.trim() ? form.rewardDescription.trim() : null,
    rewardImagePath: kind === 'custom' ? form.rewardImagePath : null,
  };
}

// --- home page -------------------------------------------------------------------------------------

export const BannerItemForm = z.object({
  id: z.string().nullable(),
  kind: z.enum(['image', 'youtube']),
  imagePath: z.string().nullable(),
  youtubeId: z.string().nullable(),
  title: z.string().max(60),
  linkUrl: z.string().nullable().optional(),
  sort: z.number().int(),
  isActive: z.boolean(),
});
export type BannerItemForm = z.infer<typeof BannerItemForm>;

export const HomeForm = z.object({
  announcementText: z.string().max(160),
  announcementTone: z.enum(['info', 'promo', 'warning']),
  announcementEndsAt: z.string().nullable(),
  aboutText: z.string().max(600),
  googleReviewUrl: z.string().nullable().optional(),
  banners: z.array(BannerItemForm).max(3),
});
export type HomeForm = z.infer<typeof HomeForm>;

export function homeFromSettings(settings: ShopSettings, banners: readonly { id: string | null; kind: 'image' | 'youtube'; imagePath: string | null; youtubeId: string | null; title: string; linkUrl: string | null; sort: number; isActive: boolean }[]): HomeForm {
  return {
    announcementText: settings.announcementText ?? '',
    announcementTone: settings.announcementTone ?? 'info',
    announcementEndsAt: settings.announcementEndsAt ? settings.announcementEndsAt.slice(0, 10) : null,
    aboutText: settings.aboutText ?? '',
    googleReviewUrl: settings.googleReviewUrl ?? '',
    banners: banners.map((b, idx) => ({
      id: b.id,
      kind: b.kind,
      imagePath: b.imagePath,
      youtubeId: b.youtubeId,
      title: b.title,
      linkUrl: b.linkUrl ?? '',
      sort: idx,
      isActive: b.isActive,
    })),
  };
}

export function homePatch(form: HomeForm): ShopSettingsPatch {
  const announcementText = form.announcementText.trim();
  const aboutText = form.aboutText.trim();
  const googleReviewUrl = form.googleReviewUrl?.trim();

  return {
    announcementText: announcementText === '' ? null : announcementText,
    announcementTone: form.announcementTone,
    announcementEndsAt: form.announcementEndsAt && form.announcementEndsAt !== '' ? new Date(form.announcementEndsAt).toISOString() : null,
    aboutText: aboutText === '' ? null : aboutText,
    googleReviewUrl: googleReviewUrl && googleReviewUrl !== '' ? googleReviewUrl : null,
  };
}
