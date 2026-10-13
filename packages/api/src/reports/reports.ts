import { dbFunctions, ManilaDate, ordersCsv } from '@smartapp/core';
import type { BoardOrder, DashboardToday, DbFunctionInput, MemberInsights, SalesReport } from '@smartapp/core';

import type { ApiClient } from '../client';
import { boardOrderFromRow } from '../board/mappers';
import { throwIfError } from '../errors';
import { fromJson, parsed } from '../rows';

// Slice 6: Home numbers, member insights, reports and the orders export (docs/api-surface.md). The numbers come from
// the P5.6 database functions, computed in Manila time (definitions in decision P5-12).

export type SalesReportRange = Omit<DbFunctionInput<'get_sales_report'>, 'tenantId'>;

/** Rows per request of the export; the server returns at most 1000 at a time. */
export const EXPORT_PAGE = 1000;
/** Excel opens a UTF-8 CSV correctly (ñ, ₱) only with a byte order mark. */
const BOM = '﻿';

export async function getDashboardToday(client: ApiClient, tenantId: string): Promise<DashboardToday> {
  const input = parsed(dbFunctions.get_dashboard_today.input.safeParse({ tenantId }));
  const { data, error } = await client.rpc('get_dashboard_today', { p_tenant_id: input.tenantId });
  throwIfError(error);
  return fromJson(dbFunctions.get_dashboard_today.output, data);
}

export async function getMemberInsights(client: ApiClient, tenantId: string): Promise<MemberInsights> {
  const input = parsed(dbFunctions.get_member_insights.input.safeParse({ tenantId }));
  const { data, error } = await client.rpc('get_member_insights', { p_tenant_id: input.tenantId });
  throwIfError(error);
  return fromJson(dbFunctions.get_member_insights.output, data);
}

/** Sales per Manila date from `from` to `to` (both included, at most 92 days; longer is `invalid`). */
export async function getSalesReport(client: ApiClient, tenantId: string, range: SalesReportRange): Promise<SalesReport> {
  const input = parsed(dbFunctions.get_sales_report.input.safeParse({ tenantId, ...range }));
  const { data, error } = await client.rpc('get_sales_report', { p_tenant_id: input.tenantId, p_from: input.from, p_to: input.to });
  throwIfError(error);
  return fromJson(dbFunctions.get_sales_report.output, data);
}

/** Every order of the Manila dates `from` to `to`, oldest first, each with its lines (read in pages). */
export async function getOrdersForExport(client: ApiClient, tenantId: string, range: SalesReportRange): Promise<BoardOrder[]> {
  const from = parsed(ManilaDate.safeParse(range.from));
  const to = parsed(ManilaDate.safeParse(range.to));
  const orders: BoardOrder[] = [];
  for (let offset = 0; ; offset += EXPORT_PAGE) {
    const { data, error } = await client
      .from('orders')
      .select('*, order_items (*)')
      .eq('tenant_id', tenantId)
      .gte('business_date', from)
      .lte('business_date', to)
      .order('placed_at')
      .order('id')
      .range(offset, offset + EXPORT_PAGE - 1);
    throwIfError(error);
    const page = data ?? [];
    orders.push(...page.map(boardOrderFromRow));
    if (page.length < EXPORT_PAGE) return orders;
  }
}

/** The orders of a date range as a CSV file: one row per order, Manila date and time, pesos with two decimals. */
export async function exportOrdersCsv(client: ApiClient, tenantId: string, range: SalesReportRange): Promise<Blob> {
  const orders = await getOrdersForExport(client, tenantId, range);
  return new Blob([BOM + ordersCsv(orders)], { type: 'text/csv;charset=utf-8' });
}
