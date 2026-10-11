import { createColumnHelper, useTable } from '@tanstack/react-table';

import { DataGrid, DataGridContainer, dataGridFeatures } from '@smartapp/ui/components/reui/data-grid/data-grid';
import { DataGridColumnHeader } from '@smartapp/ui/components/reui/data-grid/data-grid-column-header';
import { DataGridTable } from '@smartapp/ui/components/reui/data-grid/data-grid-table';

// Sample rows for the /kit page only.

interface CustomerRow {
  name: string;
  orders: number;
  member: string;
}

const DATA: CustomerRow[] = [
  { name: 'Maria Santos', orders: 14, member: 'Member' },
  { name: 'Jose Rizal', orders: 3, member: '—' },
  { name: 'Ana Reyes', orders: 9, member: 'Member' },
];

const helper = createColumnHelper<typeof dataGridFeatures, CustomerRow>();
const COLUMNS = helper.columns([
  helper.accessor('name', { header: ({ column }) => <DataGridColumnHeader column={column} title="Customer" /> }),
  helper.accessor('orders', { header: ({ column }) => <DataGridColumnHeader column={column} title="Orders" /> }),
  helper.accessor('member', { header: ({ column }) => <DataGridColumnHeader column={column} title="Status" /> }),
]);

/** ReUI data grid: sortable customers list (the real one comes in P4.6). */
export function DataGridDemo() {
  const table = useTable({ features: dataGridFeatures, columns: COLUMNS, data: DATA });
  return (
    <DataGrid table={table} recordCount={DATA.length}>
      <DataGridContainer className="w-full">
        <DataGridTable />
      </DataGridContainer>
    </DataGrid>
  );
}
