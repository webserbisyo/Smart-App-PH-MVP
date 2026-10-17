'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  BusinessHours,
  Closure,
  DayHours,
  DeliveryZone,
  DeliveryZoneDraft,
  PaymentAccount,
  PaymentAccountDraft,
  ShopBanner,
  ShopBannerDraft,
  ShopSettings,
  ShopSettingsPatch,
  Tenant,
} from '@smartapp/core';

import { qk } from '../keys';
import { useApiClient } from '../provider';
import { useShopId } from '../shops/hooks';

import {
  addClosure,
  getBusinessHours,
  getClosures,
  getDeliveryZones,
  getPaymentAccounts,
  getShopBanners,
  getShopSettings,
  removeClosure,
  removeDeliveryZone,
  removePaymentAccount,
  saveBusinessHours,
  saveDeliveryZone,
  savePaymentAccount,
  saveShopBanners,
  updateShopName,
  updateShopSettings,
} from './settings';


// Queries take the shop id; mutations work on the signed-in owner's shop (useMyShop) and refresh what they change.

export function useShopSettings(tenantId: string) {
  const client = useApiClient();
  return useQuery<ShopSettings>({ queryKey: qk.shopSettings(tenantId), queryFn: () => getShopSettings(client, tenantId) });
}

export function useUpdateShopSettings() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const shopId = useShopId();
  return useMutation({
    mutationFn: (patch: ShopSettingsPatch) => updateShopSettings(client, shopId(), patch),
    onSuccess: (settings) => {
      queryClient.setQueryData(qk.shopSettings(settings.tenantId), settings);
    },
  });
}

export function useUpdateShopName() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const shopId = useShopId();
  return useMutation({
    mutationFn: (input: { name: string }) => updateShopName(client, shopId(), input.name),
    onSuccess: (tenant: Tenant) => {
      queryClient.setQueryData(qk.myShop, tenant);
    },
  });
}

export function useBusinessHours(tenantId: string) {
  const client = useApiClient();
  return useQuery<BusinessHours[]>({ queryKey: qk.businessHours(tenantId), queryFn: () => getBusinessHours(client, tenantId) });
}

/** The whole week at once: days left out become closed. */
export function useSaveBusinessHours() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const shopId = useShopId();
  return useMutation({
    mutationFn: (week: readonly DayHours[]) => saveBusinessHours(client, shopId(), week),
    onSuccess: (hours) => {
      queryClient.setQueryData(qk.businessHours(shopId()), hours);
    },
  });
}

export function useClosures(tenantId: string) {
  const client = useApiClient();
  return useQuery<Closure[]>({ queryKey: qk.closures(tenantId), queryFn: () => getClosures(client, tenantId) });
}

export function useAddClosure() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const shopId = useShopId();
  return useMutation({
    mutationFn: (input: { closedOn: string; note: string | null }) => addClosure(client, shopId(), input),
    onSuccess: (closure) => queryClient.invalidateQueries({ queryKey: qk.closures(closure.tenantId) }),
  });
}

export function useRemoveClosure() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const shopId = useShopId();
  return useMutation({
    mutationFn: (input: { closedOn: string }) => removeClosure(client, shopId(), input.closedOn),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.closures(shopId()) }),
  });
}

export function usePaymentAccounts(tenantId: string) {
  const client = useApiClient();
  return useQuery<PaymentAccount[]>({ queryKey: qk.paymentAccounts(tenantId), queryFn: () => getPaymentAccounts(client, tenantId) });
}

export function useSavePaymentAccount() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const shopId = useShopId();
  return useMutation({
    mutationFn: (draft: PaymentAccountDraft) => savePaymentAccount(client, shopId(), draft),
    onSuccess: (account) => queryClient.invalidateQueries({ queryKey: qk.paymentAccounts(account.tenantId) }),
  });
}

export function useRemovePaymentAccount() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const shopId = useShopId();
  return useMutation({
    mutationFn: (input: { accountId: string }) => removePaymentAccount(client, input.accountId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.paymentAccounts(shopId()) }),
  });
}

export function useDeliveryZones(tenantId: string) {
  const client = useApiClient();
  return useQuery<DeliveryZone[]>({ queryKey: qk.deliveryZones(tenantId), queryFn: () => getDeliveryZones(client, tenantId) });
}

export function useSaveDeliveryZone() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const shopId = useShopId();
  return useMutation({
    mutationFn: (draft: DeliveryZoneDraft) => saveDeliveryZone(client, shopId(), draft),
    onSuccess: (zone) => queryClient.invalidateQueries({ queryKey: qk.deliveryZones(zone.tenantId) }),
  });
}

export function useRemoveDeliveryZone() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const shopId = useShopId();
  return useMutation({
    mutationFn: (input: { zoneId: string }) => removeDeliveryZone(client, input.zoneId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.deliveryZones(shopId()) }),
  });
}

export function useShopBanners(tenantId: string) {
  const client = useApiClient();
  return useQuery<ShopBanner[]>({ queryKey: qk.shopBanners(tenantId), queryFn: () => getShopBanners(client, tenantId) });
}

export function useSaveShopBanners() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const shopId = useShopId();
  return useMutation({
    mutationFn: (banners: readonly ShopBannerDraft[]) => saveShopBanners(client, shopId(), banners),
    onSuccess: (banners) => {
      const id = shopId();
      queryClient.setQueryData(qk.shopBanners(id), banners);
      void queryClient.invalidateQueries({ queryKey: qk.shopBanners(id) });
    },
  });
}

