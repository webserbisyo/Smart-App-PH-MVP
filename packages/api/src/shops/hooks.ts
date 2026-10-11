'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Slug } from '@smartapp/core';
import type { BusinessType, Tenant } from '@smartapp/core';

import { qk } from '../keys';
import { useApiClient } from '../provider';

import { createMyShop, getMyShop, slugAvailable } from './shops';

export function useMyShop() {
  const client = useApiClient();
  return useQuery<Tenant | null>({ queryKey: qk.myShop, queryFn: () => getMyShop(client) });
}

/** Debounce in the screen; an invalid slug is false without asking the database. */
export function useSlugAvailable(slug: string) {
  const client = useApiClient();
  const valid = Slug.safeParse(slug).success;
  return useQuery<boolean>({
    queryKey: qk.slugAvailable(slug),
    queryFn: () => (valid ? slugAvailable(client, slug) : Promise.resolve(false)),
    enabled: slug.length > 0,
    staleTime: 10_000,
  });
}

export function useCreateMyShop() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { businessType: BusinessType; name: string; slug: string }) => createMyShop(client, input),
    onSuccess: (tenant) => {
      queryClient.setQueryData(qk.myShop, tenant);
    },
  });
}
