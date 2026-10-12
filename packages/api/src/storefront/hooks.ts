'use client';

import { useQuery } from '@tanstack/react-query';

import type { Storefront } from '@smartapp/core';

import { qk } from '../keys';
import { useApiClient } from '../provider';

import { getStorefront } from './storefront';

/** The shop page's data on the client (server pages call `getStorefront` directly). */
export function useStorefront(slug: string) {
  const client = useApiClient();
  return useQuery<Storefront | null>({ queryKey: qk.storefront(slug), queryFn: () => getStorefront(client, slug) });
}
