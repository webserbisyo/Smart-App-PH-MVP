import { useState } from 'react';

import { exportCustomersCsv, useApiClient, useCustomers } from '@smartapp/api';
import { formatPeso, formatPhPhone, WORDS } from '@smartapp/core';
import type { CustomerRow } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Input } from '@smartapp/ui/components/input';
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@smartapp/ui/components/item';
import { Label } from '@smartapp/ui/components/label';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { Spinner } from '@smartapp/ui/components/spinner';
import { Switch } from '@smartapp/ui/components/switch';
import { useFormFactor } from '@smartapp/ui/hooks/use-form-factor';
import { useOnline } from '@smartapp/ui/hooks/use-online';
import { IconChevronRight, IconDownload, IconSearch, IconUsers } from '@smartapp/ui/icons';
import { PageBody } from '@smartapp/ui/patterns/PageBody';
import { QueryState } from '@smartapp/ui/patterns/QueryState';

import { useDebounced } from '../../../app/debounce';
import { useDownload } from '../../../app/download';
import { useShop } from '../../../app/shop';
import { useToday } from '../../../app/today';
import { CustomerGrid } from '../components/CustomerGrid';
import { CustomerSheet } from '../components/CustomerSheet';
import { MemberBadge } from '../components/MemberBadge';

const words = WORDS.dashboard.customers;
const shared = WORDS.shared;

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
}

/** One customer as a row on phones. */
function CustomerItem({ customer, onOpen }: { customer: CustomerRow; onOpen: () => void }) {
  return (
    <Item variant="outline" className="bg-card" render={<button type="button" onClick={onOpen} />}>
      <ItemContent className="min-w-0">
        <ItemTitle className="flex w-full min-w-0 items-center gap-2">
          <span className="truncate">{customer.name}</span>
          {customer.memberSince === null ? null : <MemberBadge />}
        </ItemTitle>
        <ItemDescription className="tabular truncate">
          {formatPhPhone(customer.phone)} · {words.summary(customer.orderCount, formatPeso(customer.totalSpent))}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <IconChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
      </ItemActions>
    </Item>
  );
}

/**
 * Customers (ux-plan 5.15): search by name or mobile, Members only, Download CSV; a table on wider screens and rows on
 * phones, 50 at a time. A customer opens their sheet.
 */
export default function CustomersScreen() {
  const shop = useShop();
  const client = useApiClient();
  const online = useOnline();
  const phone = useFormFactor() === 'phone';
  const { date } = useToday();
  const [search, setSearch] = useState('');
  const [membersOnly, setMembersOnly] = useState(false);
  const [open, setOpen] = useState<CustomerRow | null>(null);
  const filter = { search: useDebounced(search), membersOnly };
  const customers = useCustomers(shop.id, filter);
  const download = useDownload(words.csvFailed);

  const rows = customers.data ?? [];
  const filtered = filter.search.trim() !== '' || membersOnly;
  const state = customers.isPending
    ? 'loading'
    : customers.isError
      ? 'error'
      : rows.length === 0 && !filtered
        ? 'empty'
        : 'ready';

  return (
    <PageBody size="wide" className="min-h-full">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="relative min-w-0 flex-1 basis-56">
          <IconSearch
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            aria-label={words.search}
            placeholder={words.search}
            value={search}
            className="pl-9"
            onChange={(event) => {
              setSearch(event.target.value);
            }}
          />
        </div>
        <Label className="flex min-h-11 items-center gap-2">
          <Switch checked={membersOnly} onCheckedChange={setMembersOnly} />
          {words.membersOnly}
        </Label>
        <Button
          variant="outline"
          disabled={!online || download.pending || rows.length === 0}
          onClick={() => {
            download.run(() => exportCustomersCsv(client, shop.id, filter), words.csv.fileName(date));
          }}
        >
          {download.pending ? <Spinner /> : <IconDownload aria-hidden="true" />}
          {words.csvButton}
        </Button>
      </div>

      <QueryState
        state={state}
        skeleton={<ListSkeleton />}
        empty={{ media: <IconUsers />, title: WORDS.dashboard.empty.customers, description: words.emptyText }}
        error={{
          title: shared.loadFailed,
          retryLabel: shared.tryAgain,
          onRetry: () => {
            void customers.refetch();
          },
        }}
        offline={online ? null : { title: shared.offlineShort }}
      >
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{words.noMatch}</p>
        ) : phone ? (
          <ItemGroup className="gap-2">
            {rows.map((customer) => (
              <CustomerItem
                key={customer.id}
                customer={customer}
                onOpen={() => {
                  setOpen(customer);
                }}
              />
            ))}
          </ItemGroup>
        ) : (
          <CustomerGrid rows={rows} onOpen={setOpen} />
        )}
        {customers.hasNextPage ? (
          <Button
            variant="outline"
            className="self-center"
            disabled={customers.isFetchingNextPage}
            onClick={() => {
              void customers.fetchNextPage();
            }}
          >
            {customers.isFetchingNextPage ? <Spinner /> : null}
            {words.loadMore}
          </Button>
        ) : null}
      </QueryState>

      <CustomerSheet
        customer={open}
        onClose={() => {
          setOpen(null);
        }}
      />
    </PageBody>
  );
}
