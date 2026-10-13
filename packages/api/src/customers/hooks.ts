'use client';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import type { Customer } from '@smartapp/core';

import { qk } from '../keys';
import { useApiClient } from '../provider';

import { getCustomers, updateCustomerNotes } from './customers';
import type { CustomerFilter, CustomerNotesInput } from './customers';

/**
 * The shop's customers with their stamps, 50 at a time: `data` is every row loaded so far; `hasNextPage` and
 * `fetchNextPage` are the "Load more" button. Debounce the search in the screen.
 */
export function useCustomers(tenantId: string, filter: CustomerFilter) {
  const client = useApiClient();
  const search = filter.search.trim();
  return useInfiniteQuery({
    queryKey: qk.customerList(tenantId, search, filter.membersOnly),
    queryFn: ({ pageParam }) => getCustomers(client, tenantId, { search, membersOnly: filter.membersOnly }, pageParam),
    initialPageParam: 0,
    getNextPageParam: (page) => page.nextOffset,
    select: (data) => data.pages.flatMap((page) => page.rows),
  });
}

/** Saves the owner's notes and tags on a customer, then refreshes the shop's customer lists. */
export function useUpdateCustomerNotes() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CustomerNotesInput): Promise<Customer> => updateCustomerNotes(client, input),
    onSuccess: (customer) => {
      void queryClient.invalidateQueries({ queryKey: qk.customers(customer.tenantId) });
    },
  });
}
