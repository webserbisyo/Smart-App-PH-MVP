import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { mediaUrl, removeShopMedia, useApiClient, usePaymentAccounts, useRemovePaymentAccount, useSavePaymentAccount, useSaveSortOrder } from '@smartapp/api';
import { errorWords, TransferMethod, WORDS } from '@smartapp/core';
import type { PaymentAccount } from '@smartapp/core';
import { FLUENT_ICONS } from '@smartapp/ui/assets/fluent';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@smartapp/ui/components/alert-dialog';
import { Badge } from '@smartapp/ui/components/badge';
import { Button } from '@smartapp/ui/components/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@smartapp/ui/components/responsive-dialog';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { toast } from '@smartapp/ui/components/sonner';
import { Sortable, SortableContent, SortableItem, SortableItemHandle } from '@smartapp/ui/components/sortable';
import { Spinner } from '@smartapp/ui/components/spinner';
import { Switch } from '@smartapp/ui/components/switch';
import { useFormFactor } from '@smartapp/ui/hooks/use-form-factor';
import { useOnline } from '@smartapp/ui/hooks/use-online';
import { IconCreditCard, IconGripVertical, IconPencil, IconPlus } from '@smartapp/ui/icons';
import { IMAGE_SIZES } from '@smartapp/ui/lib/compress-image';
import { cn } from '@smartapp/ui/lib/utils';
import { PageBody } from '@smartapp/ui/patterns/PageBody';
import { PhotoField } from '@smartapp/ui/patterns/PhotoField';
import { QueryState } from '@smartapp/ui/patterns/QueryState';
import { StickyActionBar } from '@smartapp/ui/patterns/StickyActionBar';

import { useMediaUpload } from '../../../app/media';
import { useShop, useVocab } from '../../../app/shop';
import { paymentDraft, PaymentForm, paymentFromAccount } from '../forms';
import { useSaveRunner } from '../hooks/useSaveRunner';

const words = WORDS.dashboard.settings.payments;
const shared = WORDS.shared;
const methodWords = WORDS.order.method;

function accountTitle(account: PaymentAccount): string {
  return account.method === 'bank' && account.bankName ? account.bankName : methodWords[account.method];
}

/** Add or edit one account: type, bank, name, number, QR and "Show at checkout"; delete with a confirm. */
function AccountForm({ account, onDone }: { account: PaymentAccount | null; onDone: () => void }) {
  const client = useApiClient();
  const vocab = useVocab();
  const online = useOnline();
  const save = useSavePaymentAccount();
  const remove = useRemovePaymentAccount();
  const upload = useMediaUpload('qr');
  const { saving, error, run } = useSaveRunner();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const form = useForm<PaymentForm>({ resolver: zodResolver(PaymentForm), defaultValues: paymentFromAccount(account) });
  const { errors } = form.formState;
  const method = useWatch({ control: form.control, name: 'method' });
  const disabled = saving || !online;

  const submit = (values: PaymentForm) =>
    run(async () => {
      await save.mutateAsync(paymentDraft(account?.id ?? null, values));
      // A replaced or removed QR is no longer used anywhere.
      if (account?.qrPath && account.qrPath !== values.qrPath) await removeShopMedia(client, [account.qrPath]);
      onDone();
    });

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        void form.handleSubmit(submit)(event);
      }}
    >
      <ResponsiveDialogHeader>
        <ResponsiveDialogTitle>{account ? words.edit : words.add}</ResponsiveDialogTitle>
      </ResponsiveDialogHeader>
      <FieldGroup className="px-4 pb-2 sm:px-0">
        <Controller
          control={form.control}
          name="method"
          render={({ field }) => (
            <FieldSet>
              <FieldLegend variant="label">{words.method}</FieldLegend>
              <div className="grid grid-cols-3 gap-2">
                {TransferMethod.options.map((option) => (
                  <Button
                    key={option}
                    variant="outline"
                    aria-pressed={field.value === option}
                    disabled={disabled}
                    className={cn(field.value === option && 'border-primary ring-2 ring-primary/30')}
                    onClick={() => {
                      field.onChange(option);
                    }}
                  >
                    {option === 'bank' ? words.bankName : methodWords[option]}
                  </Button>
                ))}
              </div>
            </FieldSet>
          )}
        />
        {method === 'bank' ? (
          <Field data-invalid={errors.bankName !== undefined || undefined}>
            <FieldLabel htmlFor="payment-bank">{words.bankName}</FieldLabel>
            <Input id="payment-bank" maxLength={60} placeholder={words.bankPlaceholder} aria-invalid={errors.bankName !== undefined} disabled={disabled} {...form.register('bankName')} />
            {errors.bankName?.message ? <FieldError>{errors.bankName.message}</FieldError> : null}
          </Field>
        ) : null}
        <Field data-invalid={errors.accountName !== undefined || undefined}>
          <FieldLabel htmlFor="payment-name">{words.accountName}</FieldLabel>
          <Input id="payment-name" maxLength={80} autoComplete="name" aria-invalid={errors.accountName !== undefined} disabled={disabled} {...form.register('accountName')} />
          {errors.accountName?.message ? <FieldError>{errors.accountName.message}</FieldError> : null}
        </Field>
        <Field data-invalid={errors.accountNumber !== undefined || undefined}>
          <FieldLabel htmlFor="payment-number">{words.accountNumber}</FieldLabel>
          <Input
            id="payment-number"
            maxLength={40}
            inputMode={method === 'bank' ? 'text' : 'tel'}
            autoComplete="off"
            className="tabular"
            aria-invalid={errors.accountNumber !== undefined}
            disabled={disabled}
            {...form.register('accountNumber')}
          />
          {errors.accountNumber?.message ? <FieldError>{errors.accountNumber.message}</FieldError> : null}
        </Field>
        <Controller
          control={form.control}
          name="qrPath"
          render={({ field }) => (
            <PhotoField
              label={words.qr}
              value={field.value ? mediaUrl(field.value, 'full') : null}
              upload={upload}
              onChange={field.onChange}
              compress={IMAGE_SIZES.qr}
              words={shared.photo}
              disabled={disabled}
            />
          )}
        />
        <Controller
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <Field orientation="horizontal" className="justify-between">
              <FieldLabel htmlFor="payment-active">{words.active}</FieldLabel>
              <Switch id="payment-active" checked={field.value} onCheckedChange={field.onChange} disabled={disabled} />
            </Field>
          )}
        />
        {error ? <FieldError>{errorWords(error, vocab)}</FieldError> : null}
        {online ? null : <FieldDescription>{WORDS.dashboard.settings.offline}</FieldDescription>}
      </FieldGroup>

      <ResponsiveDialogFooter className="flex-row flex-wrap justify-between gap-2">
        {account ? (
          <Button
            variant="ghost"
            className="text-destructive-text"
            disabled={disabled || remove.isPending}
            onClick={() => {
              setConfirmDelete(true);
            }}
          >
            {words.delete}
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={disabled}>
          {saving ? <Spinner /> : null}
          {shared.save}
        </Button>
      </ResponsiveDialogFooter>

      {account ? (
        <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{words.deleteConfirm(accountTitle(account))}</AlertDialogTitle>
              <AlertDialogDescription>{words.deleteText}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{words.cancel}</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => {
                  setConfirmDelete(false);
                  remove.mutate(
                    { accountId: account.id },
                    {
                      onSuccess: () => {
                        if (account.qrPath) void removeShopMedia(client, [account.qrPath]);
                        toast.success(words.deleted);
                        onDone();
                      },
                      onError: () => {
                        toast.error(errorWords('unknown', vocab));
                      },
                    },
                  );
                }}
              >
                {words.delete}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </form>
  );
}

/** GCash, Maya and bank accounts in checkout order (drag to sort); tap one to edit it in a dialog. */
export default function PaymentsScreen() {
  const shop = useShop();
  const online = useOnline();
  const phone = useFormFactor() === 'phone';
  const accounts = usePaymentAccounts(shop.id);
  const sortOrder = useSaveSortOrder();
  const [editing, setEditing] = useState<{ open: boolean; account: PaymentAccount | null; key: number }>({ open: false, account: null, key: 0 });
  // The dragged order shows at once; it clears once the saved order is back from the database.
  const [dragged, setDragged] = useState<PaymentAccount[] | null>(null);

  const list = dragged ?? accounts.data ?? [];
  const state = accounts.isPending ? 'loading' : accounts.isError ? 'error' : list.length === 0 ? 'empty' : 'ready';
  const openFor = (account: PaymentAccount | null) => {
    setEditing((current) => ({ open: true, account, key: current.key + 1 }));
  };
  const addButton = (
    <Button
      className={phone ? 'w-full' : undefined}
      disabled={!online}
      onClick={() => {
        openFor(null);
      }}
    >
      <IconPlus aria-hidden="true" />
      {words.add}
    </Button>
  );

  return (
    <PageBody size="settings" className="min-h-full">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-lg font-semibold">{WORDS.dashboard.settings.sections.payments}</h2>
        <p className="text-sm text-muted-foreground">{words.description}</p>
      </div>
      {phone || state !== 'ready' ? null : <div className="flex justify-end">{addButton}</div>}

      <QueryState
        state={state}
        skeleton={
          <div className="flex flex-col gap-2">
            {Array.from({ length: 2 }, (_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        }
        empty={{
          media: <img src={FLUENT_ICONS.card.url} alt="" className="size-10" />,
          title: words.emptyTitle,
          description: words.emptyText,
          action: addButton,
        }}
        error={{
          title: shared.loadFailed,
          retryLabel: shared.tryAgain,
          onRetry: () => {
            void accounts.refetch();
          },
        }}
        offline={online ? null : { title: shared.offlineShort }}
      >
        <Sortable
          value={list}
          getItemValue={(account) => account.id}
          orientation="vertical"
          onValueChange={(next) => {
            if (!online) return;
            setDragged(next);
            sortOrder.mutate(
              { kind: 'paymentAccounts', ids: next.map((account) => account.id) },
              {
                onSettled: () => {
                  setDragged(null);
                },
                onError: () => {
                  toast.error(WORDS.dashboard.products.changeFailed);
                },
              },
            );
          }}
        >
          <SortableContent render={<ul />} className="flex flex-col gap-2">
            {list.map((account) => {
              const title = accountTitle(account);
              return (
                <SortableItem key={account.id} value={account.id} render={<li />} className="flex min-h-16 items-center gap-2 rounded-xl border bg-card py-2 pr-4 pl-1">
                  <SortableItemHandle disabled={!online} render={<Button variant="ghost" size="icon-sm" aria-label={words.move(title)} />}>
                    <IconGripVertical />
                  </SortableItemHandle>
                  <button
                    type="button"
                    className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    aria-label={words.editNamed(title)}
                    onClick={() => {
                      openFor(account);
                    }}
                  >
                    {account.qrPath ? (
                      <img src={mediaUrl(account.qrPath, 'thumb')} alt="" className="size-10 shrink-0 rounded-md border object-cover" />
                    ) : (
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <IconCreditCard aria-hidden="true" className="size-5" />
                      </span>
                    )}
                    <span className="flex min-w-0 flex-col">
                      <span className="flex items-center gap-2 font-medium">
                        <span className="truncate">{title}</span>
                        {account.isActive ? null : <Badge variant="secondary">{words.hiddenBadge}</Badge>}
                      </span>
                      <span className="truncate text-sm text-muted-foreground">
                        {account.accountName} · <span className="tabular">{account.accountNumber}</span>
                      </span>
                    </span>
                    <IconPencil aria-hidden="true" className="ml-auto size-4 shrink-0 text-muted-foreground" />
                  </button>
                </SortableItem>
              );
            })}
          </SortableContent>
        </Sortable>
      </QueryState>

      {phone && state === 'ready' ? <StickyActionBar aboveDock>{addButton}</StickyActionBar> : null}

      <ResponsiveDialog
        open={editing.open}
        onOpenChange={(open) => {
          setEditing((current) => ({ ...current, open }));
        }}
      >
        <ResponsiveDialogContent className="sm:max-w-lg">
          <AccountForm
            key={editing.key}
            account={editing.account}
            onDone={() => {
              setEditing((current) => ({ ...current, open: false }));
            }}
          />
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </PageBody>
  );
}
