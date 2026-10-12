import { DayHours, DeliveryZoneDraft, ManilaDate, PaymentAccountDraft, ShopSettingsPatch } from '@smartapp/core';
import type { BusinessHours, Closure, DeliveryZone, PaymentAccount, ShopSettings, Tenant } from '@smartapp/core';

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

  if (days.length > 0) {
    const { error } = await client.from('business_hours').upsert(days.map((day) => businessHoursToRow(tenantId, day)));
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
  const row = { tenant_id: tenantId, closed_on: closedOn, note: blankToNull(input.note) };
  return closureFromRow(must(await client.from('closures').upsert(row).select('*').single()));
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
