import { Customer, CustomerRow, Uuid } from '@smartapp/core';

import type { ApiClient } from '../client';
import type { Database } from '../database.types';
import { throwIfError } from '../errors';
import { blankToNull, must, parsed } from '../rows';

// Slice 6: the owner's customer list (docs/api-surface.md). Owners read customers and their stamp balances through
// RLS and change only the notes and tags (column grant), never the totals or the stamps.

type Tables = Database['public']['Tables'];
export type CustomerTableRow = Tables['customers']['Row'];
type BalanceRow = Pick<Database['public']['Views']['customer_stamp_balances']['Row'], 'stamps'>;

/** Customers per page of the list ("Load more" asks for the next one). */
export const CUSTOMERS_PAGE = 50;

export interface CustomerFilter {
  /** Part of a name or mobile number (`0917…`, `+63917…` or `917…`); blank shows everyone. */
  search: string;
  membersOnly: boolean;
}

export interface CustomerPage {
  rows: CustomerRow[];
  /** Where the next page starts, or null on the last page. */
  nextOffset: number | null;
}

export interface CustomerNotesInput {
  customerId: string;
  notes: string | null;
  tags: string[];
}

export function customerFromRow(row: CustomerTableRow): Customer {
  return Customer.parse({
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    memberSince: row.member_since,
    orderCount: row.order_count,
    totalSpent: row.total_spent,
    lastOrderAt: row.last_order_at,
    notes: row.notes,
    tags: row.tags,
  });
}

export function customerRowFromRow(row: CustomerTableRow & { customer_stamp_balances: BalanceRow[] }): CustomerRow {
  return CustomerRow.parse({ ...customerFromRow(row), stamps: row.customer_stamp_balances[0]?.stamps ?? 0 });
}

/** `*text*` for ilike, with the LIKE wildcards `%` and `_` (and `\`) in the text matched as themselves. */
export function likeContains(text: string): string {
  return `*${text.replace(/[\\%_]/g, (character) => `\\${character}`)}*`;
}

/** A value inside a PostgREST `or=(…)` filter, quoted so commas, dots and brackets in it stay text. */
function quoted(value: string): string {
  return `"${value.replace(/[\\"]/g, (character) => `\\${character}`)}"`;
}

/**
 * The `or` filter for a search: the name contains it, or, when it looks like a mobile number, the phone contains its
 * digits without the leading `0` or `63` (phones are stored as `+639…`). Null when the search is blank. `*` is the
 * PostgREST wildcard, so it is dropped from the text.
 */
export function customerSearchFilter(search: string): string | null {
  const text = search.replace(/\*/g, '').trim();
  if (text === '') return null;
  const filters = [`name.ilike.${quoted(likeContains(text))}`];
  const compact = text.replace(/[\s().-]/g, '');
  if (/^\+?\d+$/.test(compact)) {
    const digits = compact.replace(/^\+/, '').replace(/^(63|0)/, '');
    if (digits !== '') filters.push(`phone.ilike.${quoted(likeContains(digits))}`);
  }
  return filters.join(',');
}

/** One page of the shop's customers with their stamps, newest order first (customers without orders last). */
export async function getCustomers(client: ApiClient, tenantId: string, filter: CustomerFilter, offset = 0): Promise<CustomerPage> {
  const shop = parsed(Uuid.safeParse(tenantId));
  let query = client.from('customers').select('*, customer_stamp_balances (stamps)').eq('tenant_id', shop);
  const search = customerSearchFilter(filter.search);
  if (search !== null) query = query.or(search);
  if (filter.membersOnly) query = query.not('member_since', 'is', null);
  // One extra row tells whether another page follows.
  const { data, error } = await query
    .order('last_order_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .order('id')
    .range(offset, offset + CUSTOMERS_PAGE);
  throwIfError(error);
  const rows = data ?? [];
  return {
    rows: rows.slice(0, CUSTOMERS_PAGE).map(customerRowFromRow),
    nextOffset: rows.length > CUSTOMERS_PAGE ? offset + CUSTOMERS_PAGE : null,
  };
}

/** The owner's notes and tags on a customer (trimmed; blank notes become none, blank and repeated tags are dropped). */
export async function updateCustomerNotes(client: ApiClient, input: CustomerNotesInput): Promise<Customer> {
  const customerId = parsed(Uuid.safeParse(input.customerId));
  const notes = blankToNull(input.notes);
  const tags = [...new Set(input.tags.map((tag) => tag.trim()).filter((tag) => tag !== ''))];
  parsed(Customer.pick({ notes: true, tags: true }).safeParse({ notes, tags }));
  return customerFromRow(must(await client.from('customers').update({ notes, tags }).eq('id', customerId).select('*').single()));
}
