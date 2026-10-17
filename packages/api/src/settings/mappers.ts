import { BusinessHours, Closure, DeliveryZone, PaymentAccount, ShopBanner, ShopSettings } from '@smartapp/core';
import type { DayHours, DeliveryZoneDraft, PaymentAccountDraft, ShopBannerDraft, ShopSettingsPatch } from '@smartapp/core';

import type { Database } from '../database.types';

type Tables = Database['public']['Tables'];
export type ShopSettingsRow = Tables['shop_settings']['Row'];
export type ShopSettingsUpdate = Tables['shop_settings']['Update'];
export type BusinessHoursRow = Tables['business_hours']['Row'];
export type ClosureRow = Tables['closures']['Row'];
export type PaymentAccountRow = Tables['payment_accounts']['Row'];
export type PaymentAccountInsert = Tables['payment_accounts']['Insert'];
export type DeliveryZoneRow = Tables['delivery_zones']['Row'];
export type DeliveryZoneInsert = Tables['delivery_zones']['Insert'];
export type ShopBannerRow = Tables['shop_banners']['Row'];
export type ShopBannerInsert = Tables['shop_banners']['Insert'];
export type ShopBannerUpdate = Tables['shop_banners']['Update'];

/** `08:00:00` (Postgres time) → `08:00`. */
function hhmm(time: string): string {
  return time.slice(0, 5);
}

export function shopSettingsFromRow(row: ShopSettingsRow): ShopSettings {
  return ShopSettings.parse({
    tenantId: row.tenant_id,
    logoPath: row.logo_path,
    coverPath: row.cover_path,
    tagline: row.tagline,
    phone: row.phone,
    email: row.email,
    address: row.address,
    city: row.city,
    mapsUrl: row.maps_url,
    facebookUrl: row.facebook_url,
    messengerUsername: row.messenger_username,
    colorPrimary: row.color_primary,
    colorSecondary: row.color_secondary,
    colorAccent: row.color_accent,
    acceptingOrders: row.accepting_orders,
    busyUntil: row.busy_until,
    walkInEnabled: row.walk_in_enabled,
    pickupEnabled: row.pickup_enabled,
    deliveryEnabled: row.delivery_enabled,
    codEnabled: row.cod_enabled,
    payLaterPickup: row.pay_later_pickup,
    deliveryFeeViaMessenger: row.delivery_fee_via_messenger,
    unpaidExpiryMinutes: row.unpaid_expiry_minutes,
    showMemberCount: row.show_member_count,
    announcementText: row.announcement_text,
    announcementTone: row.announcement_tone,
    announcementEndsAt: row.announcement_ends_at,
    aboutText: row.about_text,
    googleReviewUrl: row.google_review_url,
    shopLat: row.shop_lat,
    shopLng: row.shop_lng,
    pin: row.shop_lat !== null && row.shop_lng !== null ? { lat: row.shop_lat, lng: row.shop_lng } : null,
  });
}

/** Only the fields that are set; `tenantId` cannot be changed. */
export function shopSettingsToUpdate(patch: ShopSettingsPatch): ShopSettingsUpdate {
  const update: ShopSettingsUpdate = {};
  if (patch.logoPath !== undefined) update.logo_path = patch.logoPath;
  if (patch.coverPath !== undefined) update.cover_path = patch.coverPath;
  if (patch.tagline !== undefined) update.tagline = patch.tagline;
  if (patch.phone !== undefined) update.phone = patch.phone;
  if (patch.email !== undefined) update.email = patch.email;
  if (patch.address !== undefined) update.address = patch.address;
  if (patch.city !== undefined) update.city = patch.city;
  if (patch.mapsUrl !== undefined) update.maps_url = patch.mapsUrl;
  if (patch.facebookUrl !== undefined) update.facebook_url = patch.facebookUrl;
  if (patch.messengerUsername !== undefined) update.messenger_username = patch.messengerUsername;
  if (patch.colorPrimary !== undefined) update.color_primary = patch.colorPrimary;
  if (patch.colorSecondary !== undefined) update.color_secondary = patch.colorSecondary;
  if (patch.colorAccent !== undefined) update.color_accent = patch.colorAccent;
  if (patch.acceptingOrders !== undefined) update.accepting_orders = patch.acceptingOrders;
  if (patch.busyUntil !== undefined) update.busy_until = patch.busyUntil;
  if (patch.walkInEnabled !== undefined) update.walk_in_enabled = patch.walkInEnabled;
  if (patch.pickupEnabled !== undefined) update.pickup_enabled = patch.pickupEnabled;
  if (patch.deliveryEnabled !== undefined) update.delivery_enabled = patch.deliveryEnabled;
  if (patch.codEnabled !== undefined) update.cod_enabled = patch.codEnabled;
  if (patch.payLaterPickup !== undefined) update.pay_later_pickup = patch.payLaterPickup;
  if (patch.deliveryFeeViaMessenger !== undefined) update.delivery_fee_via_messenger = patch.deliveryFeeViaMessenger;
  if (patch.unpaidExpiryMinutes !== undefined) update.unpaid_expiry_minutes = patch.unpaidExpiryMinutes;
  if (patch.showMemberCount !== undefined) update.show_member_count = patch.showMemberCount;
  if (patch.announcementText !== undefined) update.announcement_text = patch.announcementText;
  if (patch.announcementTone !== undefined) update.announcement_tone = patch.announcementTone;
  if (patch.announcementEndsAt !== undefined) update.announcement_ends_at = patch.announcementEndsAt;
  if (patch.aboutText !== undefined) update.about_text = patch.aboutText;
  if (patch.googleReviewUrl !== undefined) update.google_review_url = patch.googleReviewUrl;
  if (patch.shopLat !== undefined) update.shop_lat = patch.shopLat;
  if (patch.shopLng !== undefined) update.shop_lng = patch.shopLng;
  if (patch.pin !== undefined) {
    update.shop_lat = patch.pin?.lat ?? null;
    update.shop_lng = patch.pin?.lng ?? null;
  }
  return update;
}


export function businessHoursFromRow(row: BusinessHoursRow): BusinessHours {
  return BusinessHours.parse({
    tenantId: row.tenant_id,
    weekday: row.weekday,
    opensAt: hhmm(row.opens_at),
    closesAt: hhmm(row.closes_at),
  });
}

export function businessHoursToRow(tenantId: string, day: DayHours): BusinessHoursRow {
  return { tenant_id: tenantId, weekday: day.weekday, opens_at: day.opensAt, closes_at: day.closesAt };
}

export function closureFromRow(row: ClosureRow): Closure {
  return Closure.parse({ tenantId: row.tenant_id, closedOn: row.closed_on, note: row.note });
}

export function paymentAccountFromRow(row: PaymentAccountRow): PaymentAccount {
  return PaymentAccount.parse({
    id: row.id,
    tenantId: row.tenant_id,
    method: row.method,
    accountName: row.account_name,
    accountNumber: row.account_number,
    bankName: row.bank_name,
    qrPath: row.qr_path,
    isActive: row.is_active,
    sort: row.sort,
  });
}

/** Insert or update values (`id` only when it is an existing account). */
export function paymentAccountToRow(tenantId: string, draft: PaymentAccountDraft): PaymentAccountInsert {
  return {
    ...(draft.id === null ? {} : { id: draft.id }),
    tenant_id: tenantId,
    method: draft.method,
    account_name: draft.accountName,
    account_number: draft.accountNumber,
    bank_name: draft.bankName,
    qr_path: draft.qrPath,
    is_active: draft.isActive,
  };
}

export function deliveryZoneFromRow(row: DeliveryZoneRow): DeliveryZone {
  return DeliveryZone.parse({
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    fee: row.fee,
    etaText: row.eta_text,
    isActive: row.is_active,
    sort: row.sort,
    centerLat: row.center_lat,
    centerLng: row.center_lng,
    center: row.center_lat !== null && row.center_lng !== null ? { lat: row.center_lat, lng: row.center_lng } : null,
  });
}

export function deliveryZoneToRow(tenantId: string, draft: DeliveryZoneDraft): DeliveryZoneInsert {
  return {
    ...(draft.id === null ? {} : { id: draft.id }),
    tenant_id: tenantId,
    name: draft.name,
    fee: draft.fee,
    eta_text: draft.etaText,
    is_active: draft.isActive,
    center_lat: draft.centerLat ?? draft.center?.lat ?? null,
    center_lng: draft.centerLng ?? draft.center?.lng ?? null,
  };
}

export function shopBannerFromRow(row: ShopBannerRow): ShopBanner {
  return ShopBanner.parse({
    id: row.id,
    tenantId: row.tenant_id,
    kind: row.kind,
    imagePath: row.image_path,
    youtubeId: row.youtube_id,
    title: row.title,
    linkUrl: row.link_url,
    sort: row.sort,
    isActive: row.is_active,
    createdAt: row.created_at,
  });
}

export function shopBannerToRow(tenantId: string, draft: ShopBannerDraft): ShopBannerInsert {
  return {
    ...(draft.id === null ? {} : { id: draft.id }),
    tenant_id: tenantId,
    kind: draft.kind,
    image_path: draft.imagePath,
    youtube_id: draft.youtubeId,
    title: draft.title.trim(),
    link_url: draft.linkUrl,
    sort: draft.sort,
    is_active: draft.isActive,
  };
}

export function shopBannerToUpdate(draft: ShopBannerDraft): ShopBannerUpdate {
  return {
    kind: draft.kind,
    image_path: draft.imagePath,
    youtube_id: draft.youtubeId,
    title: draft.title.trim(),
    link_url: draft.linkUrl,
    sort: draft.sort,
    is_active: draft.isActive,
  };
}

