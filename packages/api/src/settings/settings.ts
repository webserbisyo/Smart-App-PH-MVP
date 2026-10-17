import { DayHours, DeliveryZoneDraft, ManilaDate, PaymentAccountDraft, ShopBannerDraft, ShopSettingsPatch } from '@smartapp/core';
import type { BusinessHours, Closure, DeliveryZone, PaymentAccount, ShopBanner, ShopSettings, Tenant } from '@smartapp/core';

import type { ApiClient } from '../client';
import { ApiError, throwIfError } from '../errors';
import { removeShopMedia } from '../media';
import { blankToNull, must, nextSort, parsed } from '../rows';
import { tenantFromRow } from '../shops/mappers';

import {
  businessHoursFromRow,
  businessHoursToRow,
  closureFromRow,
  deliveryZoneFromRow,
  deliveryZoneToRow,
  paymentAccountFromRow,
  paymentAccountToRow,
  shopBannerFromRow,
  shopBannerToRow,
  shopBannerToUpdate,
  shopSettingsFromRow,
  shopSettingsToUpdate,
} from './mappers';


// --- shop settings and name ------------------------------------------------------------------------

export async function getShopSettings(client: ApiClient, tenantId: string): Promise<ShopSettings> {
  return shopSettingsFromRow(must(await client.from('shop_settings').select('*').eq('tenant_id', tenantId).single()));
}

export async function updateShopSettings(client: ApiClient, tenantId: string, patch: ShopSettingsPatch): Promise<ShopSettings> {
  const changes = shopSettingsToUpdate(parsed(ShopSettingsPatch.safeParse(patch)));
  return shopSettingsFromRow(must(await client.from('shop_settings').update(changes).eq('tenant_id', tenantId).select('*').single()));
}

export async function updateShopName(client: ApiClient, tenantId: string, name: string): Promise<Tenant> {
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 80) throw new ApiError('invalid');
  return tenantFromRow(must(await client.from('tenants').update({ name: trimmed }).eq('id', tenantId).select('*').single()));
}

// --- business hours and closures -------------------------------------------------------------------

export async function getBusinessHours(client: ApiClient, tenantId: string): Promise<BusinessHours[]> {
  const { data, error } = await client.from('business_hours').select('*').eq('tenant_id', tenantId).order('weekday');
  throwIfError(error);
  return (data ?? []).map(businessHoursFromRow);
}

/** Replaces the whole week: the days given are saved, every other day becomes closed. */
export async function saveBusinessHours(client: ApiClient, tenantId: string, week: readonly DayHours[]): Promise<BusinessHours[]> {
  const days = week.map((day) => parsed(DayHours.safeParse(day)));
  if (new Set(days.map((day) => day.weekday)).size !== days.length) throw new ApiError('invalid');

  // Owners may only change the times of a saved day (column grants), so saved days are updated and new days added.
  const existing = await client.from('business_hours').select('weekday').eq('tenant_id', tenantId);
  throwIfError(existing.error);
  const saved = new Set((existing.data ?? []).map((row) => row.weekday));
  const updates = days
    .filter((day) => saved.has(day.weekday))
    .map((day) => client.from('business_hours').update({ opens_at: day.opensAt, closes_at: day.closesAt }).eq('tenant_id', tenantId).eq('weekday', day.weekday));
  for (const { error } of await Promise.all(updates)) throwIfError(error);
  const added = days.filter((day) => !saved.has(day.weekday));
  if (added.length > 0) {
    const { error } = await client.from('business_hours').insert(added.map((day) => businessHoursToRow(tenantId, day)));
    throwIfError(error);
  }
  const open = days.map((day) => day.weekday);
  let remove = client.from('business_hours').delete().eq('tenant_id', tenantId);
  if (open.length > 0) remove = remove.not('weekday', 'in', `(${open.join(',')})`);
  const { error } = await remove;
  throwIfError(error);
  return getBusinessHours(client, tenantId);
}

export async function getClosures(client: ApiClient, tenantId: string): Promise<Closure[]> {
  const { data, error } = await client.from('closures').select('*').eq('tenant_id', tenantId).order('closed_on');
  throwIfError(error);
  return (data ?? []).map(closureFromRow);
}

/** Adds a closed day (or changes its note). */
export async function addClosure(client: ApiClient, tenantId: string, input: { closedOn: string; note: string | null }): Promise<Closure> {
  const closedOn = parsed(ManilaDate.safeParse(input.closedOn));
  const note = blankToNull(input.note);
  // Add the day if it is new (owners may not rewrite the key columns), then set its note.
  const { error } = await client.from('closures').upsert({ tenant_id: tenantId, closed_on: closedOn, note }, { ignoreDuplicates: true });
  throwIfError(error);
  return closureFromRow(must(await client.from('closures').update({ note }).eq('tenant_id', tenantId).eq('closed_on', closedOn).select('*').single()));
}

export async function removeClosure(client: ApiClient, tenantId: string, closedOn: string): Promise<void> {
  const { error } = await client.from('closures').delete().eq('tenant_id', tenantId).eq('closed_on', closedOn);
  throwIfError(error);
}

// --- payment accounts ------------------------------------------------------------------------------

export async function getPaymentAccounts(client: ApiClient, tenantId: string): Promise<PaymentAccount[]> {
  const { data, error } = await client
    .from('payment_accounts')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('sort')
    .order('created_at');
  throwIfError(error);
  return (data ?? []).map(paymentAccountFromRow);
}

/** Adds (no id, goes last) or changes an account. A replaced QR image is deleted from storage. */
export async function savePaymentAccount(client: ApiClient, tenantId: string, draft: PaymentAccountDraft): Promise<PaymentAccount> {
  const account = parsed(PaymentAccountDraft.safeParse(draft));
  const row = paymentAccountToRow(tenantId, account);
  if (account.id === null) {
    const sort = await nextSort(client, 'payment_accounts', tenantId);
    return paymentAccountFromRow(must(await client.from('payment_accounts').insert({ ...row, sort }).select('*').single()));
  }
  const before = must(await client.from('payment_accounts').select('qr_path').eq('id', account.id).single());
  const data = must(
    await client
      .from('payment_accounts')
      .update({
        method: row.method,
        account_name: row.account_name,
        account_number: row.account_number,
        bank_name: row.bank_name ?? null,
        qr_path: row.qr_path ?? null,
        is_active: row.is_active ?? true,
      })
      .eq('id', account.id)
      .select('*')
      .single(),
  );
  if (before.qr_path !== null && before.qr_path !== data.qr_path) await removeShopMedia(client, [before.qr_path]);
  return paymentAccountFromRow(data);
}

/** Removes an account and its QR image. */
export async function removePaymentAccount(client: ApiClient, accountId: string): Promise<void> {
  const { data, error } = await client.from('payment_accounts').delete().eq('id', accountId).select('qr_path');
  throwIfError(error);
  await removeShopMedia(client, (data ?? []).flatMap((row) => (row.qr_path === null ? [] : [row.qr_path])));
}

// --- delivery zones --------------------------------------------------------------------------------

export async function getDeliveryZones(client: ApiClient, tenantId: string): Promise<DeliveryZone[]> {
  const { data, error } = await client
    .from('delivery_zones')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('sort')
    .order('created_at');
  throwIfError(error);
  return (data ?? []).map(deliveryZoneFromRow);
}

/** Adds (no id, goes last) or changes a zone. */
export async function saveDeliveryZone(client: ApiClient, tenantId: string, draft: DeliveryZoneDraft): Promise<DeliveryZone> {
  const zone = parsed(DeliveryZoneDraft.safeParse(draft));
  const row = deliveryZoneToRow(tenantId, zone);
  if (zone.id === null) {
    const sort = await nextSort(client, 'delivery_zones', tenantId);
    return deliveryZoneFromRow(must(await client.from('delivery_zones').insert({ ...row, sort }).select('*').single()));
  }
  const changes = { name: row.name, fee: row.fee, eta_text: row.eta_text ?? null, is_active: row.is_active ?? true };
  return deliveryZoneFromRow(must(await client.from('delivery_zones').update(changes).eq('id', zone.id).select('*').single()));
}

export async function removeDeliveryZone(client: ApiClient, zoneId: string): Promise<void> {
  const { error } = await client.from('delivery_zones').delete().eq('id', zoneId);
  throwIfError(error);
}

// --- shop banners ----------------------------------------------------------------------------------

export async function getShopBanners(client: ApiClient, tenantId: string): Promise<ShopBanner[]> {
  const { data, error } = await client
    .from('shop_banners')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('sort')
    .order('created_at');
  throwIfError(error);
  return (data ?? []).map(shopBannerFromRow);
}

/** Saves all banners for a shop in order (up to 3 active slides; removes deleted slides). */
export async function saveShopBanners(
  client: ApiClient,
  tenantId: string,
  drafts: readonly ShopBannerDraft[],
): Promise<ShopBanner[]> {
  const parsedDrafts = drafts.map((d, index) => ({
    ...parsed(ShopBannerDraft.safeParse(d)),
    sort: index,
  }));

  const existing = await client.from('shop_banners').select('id, image_path').eq('tenant_id', tenantId);
  throwIfError(existing.error);
  const existingRows = existing.data ?? [];
  const keepIds = new Set(parsedDrafts.flatMap((d) => (d.id ? [d.id] : [])));
  const toDelete = existingRows.filter((r) => !keepIds.has(r.id));

  // Delete removed banners and their media
  if (toDelete.length > 0) {
    const deleteIds = toDelete.map((r) => r.id);
    const { error } = await client.from('shop_banners').delete().in('id', deleteIds);
    throwIfError(error);
    const imagesToRemove = toDelete.flatMap((r) => (r.image_path ? [r.image_path] : []));
    if (imagesToRemove.length > 0) await removeShopMedia(client, imagesToRemove);
  }

  // Update existing or insert new
  for (const draft of parsedDrafts) {
    if (draft.id) {
      const { error } = await client
        .from('shop_banners')
        .update(shopBannerToUpdate(draft))
        .eq('id', draft.id);
      throwIfError(error);
    } else {
      const row = shopBannerToRow(tenantId, draft);
      const { error } = await client.from('shop_banners').insert({ ...row, sort: draft.sort });
      throwIfError(error);
    }
  }

  return getShopBanners(client, tenantId);
}

export async function saveShopBanner(
  client: ApiClient,
  tenantId: string,
  draft: ShopBannerDraft,
): Promise<ShopBanner> {
  const banner = parsed(ShopBannerDraft.safeParse(draft));
  if (!banner.id) {
    const row = shopBannerToRow(tenantId, banner);
    const sort = await nextSort(client, 'shop_banners', tenantId);
    return shopBannerFromRow(must(await client.from('shop_banners').insert({ ...row, sort }).select('*').single()));
  }
  const before = must(await client.from('shop_banners').select('image_path').eq('id', banner.id).single());
  const data = must(
    await client
      .from('shop_banners')
      .update(shopBannerToUpdate(banner))
      .eq('id', banner.id)
      .select('*')
      .single(),
  );
  if (before.image_path !== null && before.image_path !== data.image_path) {
    await removeShopMedia(client, [before.image_path]);
  }
  return shopBannerFromRow(data);
}

export async function removeShopBanner(client: ApiClient, bannerId: string): Promise<void> {
  const { data, error } = await client.from('shop_banners').delete().eq('id', bannerId).select('image_path');
  throwIfError(error);
  await removeShopMedia(client, (data ?? []).flatMap((row) => (row.image_path === null ? [] : [row.image_path])));
}

