import { CustomerAddress, dbFunctions, StampRule } from '@smartapp/core';
import type { DbFunctionInput, MemberAccount } from '@smartapp/core';

import type { ApiClient } from '../client';
import type { Database } from '../database.types';
import { throwIfError } from '../errors';
import { blankToNull, fromJson, must, parsed } from '../rows';

// Slice 5: members and stamps (docs/api-surface.md). Joining, the account and every stamp go through the P5.5
// database functions; members save their own addresses and owners their stamp card with plain writes under RLS.

type Tables = Database['public']['Tables'];
export type StampRuleRow = Tables['loyalty_rules']['Row'];
export type AddressRow = Tables['customer_addresses']['Row'];

export type JoinAsMemberInput = DbFunctionInput<'join_as_member'>;
/** A saved address: `id` null adds one (the first one becomes the default). */
export type AddressInput = Omit<CustomerAddress, 'id'> & { id: string | null };

export function stampRuleFromRow(row: StampRuleRow): StampRule {
  return StampRule.parse({
    tenantId: row.tenant_id,
    isActive: row.is_active,
    minOrderTotal: row.min_order_total,
    stampsNeeded: row.stamps_needed,
    rewardLabel: row.reward_label,
    rewardAmount: row.reward_amount,
  });
}

export function addressFromRow(row: AddressRow): CustomerAddress {
  return CustomerAddress.parse({
    id: row.id,
    tenantId: row.tenant_id,
    customerId: row.customer_id,
    label: row.label,
    addressLine: row.address_line,
    landmark: row.landmark,
    isDefault: row.is_default,
  });
}

/** Joins the shop as the signed-in customer; joining again returns the same account. */
export async function joinAsMember(client: ApiClient, input: JoinAsMemberInput): Promise<MemberAccount> {
  const join = parsed(dbFunctions.join_as_member.input.safeParse(input));
  const { data, error } = await client.rpc('join_as_member', {
    p_slug: join.slug,
    p_name: join.name,
    p_phone: join.phone,
    ...(join.orderToken === null ? {} : { p_order_token: join.orderToken }),
  });
  throwIfError(error);
  return fromJson(dbFunctions.join_as_member.output, data);
}

/** The signed-in customer's account in this shop; null when they are not a member here. */
export async function getMyAccount(client: ApiClient, slug: string): Promise<MemberAccount | null> {
  const { data, error } = await client.rpc('get_my_account', { p_slug: slug });
  throwIfError(error);
  return fromJson(dbFunctions.get_my_account.output, data);
}

export async function saveMyAddress(client: ApiClient, input: AddressInput): Promise<CustomerAddress> {
  const address = parsed(CustomerAddress.omit({ id: true }).safeParse(input));
  const fields = {
    label: address.label.trim(),
    address_line: address.addressLine.trim(),
    landmark: blankToNull(address.landmark),
    is_default: address.isDefault,
  };
  if (input.id === null) {
    return addressFromRow(
      must(
        await client
          .from('customer_addresses')
          .insert({ ...fields, tenant_id: address.tenantId, customer_id: address.customerId })
          .select('*')
          .single(),
      ),
    );
  }
  return addressFromRow(must(await client.from('customer_addresses').update(fields).eq('id', input.id).select('*').single()));
}

export async function removeMyAddress(client: ApiClient, id: string): Promise<void> {
  const { error } = await client.from('customer_addresses').delete().eq('id', id);
  throwIfError(error);
}

/** The shop's stamp card (every shop has one, off until the owner turns it on). */
export async function getStampRule(client: ApiClient, tenantId: string): Promise<StampRule> {
  return stampRuleFromRow(must(await client.from('loyalty_rules').select('*').eq('tenant_id', tenantId).single()));
}

/** Saves the owner's stamp card ("save_stamp_rule" is this update; RLS allows only the shop's owner). */
export async function saveStampRule(client: ApiClient, input: StampRule): Promise<StampRule> {
  const rule = parsed(StampRule.safeParse(input));
  return stampRuleFromRow(
    must(
      await client
        .from('loyalty_rules')
        .update({
          is_active: rule.isActive,
          min_order_total: rule.minOrderTotal,
          stamps_needed: rule.stampsNeeded,
          reward_label: rule.rewardLabel.trim(),
          reward_amount: rule.rewardAmount,
        })
        .eq('tenant_id', rule.tenantId)
        .select('*')
        .single(),
    ),
  );
}
