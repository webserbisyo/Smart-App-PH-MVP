'use client';

import { useQuery } from '@tanstack/react-query';

import type { DashboardToday, MemberInsights, SalesReport } from '@smartapp/core';

import { qk } from '../keys';
import { useApiClient } from '../provider';

import { getDashboardToday, getMemberInsights, getSalesReport } from './reports';
import type { SalesReportRange } from './reports';

/** Home numbers for today (Manila); the orders board refreshes them when an order changes. */
export function useDashboardToday(tenantId: string) {
  const client = useApiClient();
  return useQuery<DashboardToday>({ queryKey: qk.dashboardToday(tenantId), queryFn: () => getDashboardToday(client, tenantId) });
}

/** The members card on Home: member count, new this week, top suki this month. */
export function useMemberInsights(tenantId: string) {
  const client = useApiClient();
  return useQuery<MemberInsights>({ queryKey: qk.memberInsights(tenantId), queryFn: () => getMemberInsights(client, tenantId) });
}

/** Sales per Manila date (today, 7 or 30 days on the Reports screen). */
export function useSalesReport(tenantId: string, range: SalesReportRange) {
  const client = useApiClient();
  return useQuery<SalesReport>({
    queryKey: qk.salesReport(tenantId, range.from, range.to),
    queryFn: () => getSalesReport(client, tenantId, range),
  });
}
