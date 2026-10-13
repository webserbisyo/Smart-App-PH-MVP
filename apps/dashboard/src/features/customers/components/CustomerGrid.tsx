import { createColumnHelper, useTable } from '@tanstack/react-table';
import { useMemo } from 'react';

import { formatPhPhone, formatShortDate, manilaDate, WORDS } from '@smartapp/core';
import type { CustomerRow } from '@smartapp/core';
import { DataGrid, DataGridContainer, dataGridFeatures } from '@smartapp/ui/components/reui/data-grid/data-grid';
import { DataGridTable } from '@smartapp/ui/components/reui/data-grid/data-grid-table';
import { Money } from '@smartapp/ui/patterns/Money';

import { MemberBadge } from './MemberBadge';

const words = WORDS.dashboard.customers;

const helper = createColumnHelper<typeof dataGridFeatures, CustomerRow>();

/** Every loaded row on one page: the list grows with Load more, not with grid pages. */
const ONE_PAGE = { pageIndex: 0, pageSize: 10_000 };

/** The customers table on tablets and laptops (ReUI data grid), in the list's order: newest order first. */
export function CustomerGrid({ rows, onOpen }: { rows: CustomerRow[]; onOpen: (customer: CustomerRow) => void }) {
  const columns = useMemo(
    () =>
      helper.columns([
    helper.accessor('name', {
      header: words.columns.name,
      cell: ({ row }) => (
        <button
          type="button"
          className="max-w-56 truncate rounded-sm text-left font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          onClick={(event) => {
            event.stopPropagation();
            onOpen(row.original);
          }}
        >
          {row.original.name}
        </button>
      ),
    }),
    helper.accessor('phone', { header: words.columns.mobile, cell: ({ row }) => <span className="tabular whitespace-nowrap">{formatPhPhone(row.original.phone)}</span> }),
    helper.accessor('memberSince', { header: words.columns.member, cell: ({ row }) => (row.original.memberSince === null ? null : <MemberBadge />) }),
    helper.accessor('orderCount', { header: words.columns.orders, cell: ({ row }) => <span className="tabular">{row.original.orderCount}</span> }),
    helper.accessor('totalSpent', { header: words.columns.spent, cell: ({ row }) => <Money amount={row.original.totalSpent} /> }),
    helper.accessor('lastOrderAt', {
      header: words.columns.lastOrder,
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {row.original.lastOrderAt === null ? words.never : formatShortDate(manilaDate(row.original.lastOrderAt))}
        </span>
      ),
    }),
      ]),
    [onOpen],
  );
  const table = useTable({
    features: dataGridFeatures,
    columns,
    data: rows,
    getRowId: (row) => row.id,
    initialState: { pagination: ONE_PAGE },
  });
  return (
    <DataGrid table={table} recordCount={rows.length} onRowClick={onOpen} emptyMessage={words.noMatch}>
      <DataGridContainer className="w-full">
        <DataGridTable />
      </DataGridContainer>
    </DataGrid>
  );
}
