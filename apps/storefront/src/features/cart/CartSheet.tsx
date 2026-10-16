'use client';

import Link from 'next/link';

import { CART_QTY_MAX, formatPeso, WORDS } from '@smartapp/core';
import { FLUENT_ICONS } from '@smartapp/ui/assets/fluent';
import { Alert, AlertDescription } from '@smartapp/ui/components/alert';
import { Button, buttonVariants } from '@smartapp/ui/components/button';
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from '@smartapp/ui/components/empty';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@smartapp/ui/components/responsive-dialog';
import { IconTrash } from '@smartapp/ui/icons';
import { cn } from '@smartapp/ui/lib/utils';
import { Money } from '@smartapp/ui/patterns/Money';
import { OrderLines } from '@smartapp/ui/patterns/OrderLines';
import { QuantityStepper } from '@smartapp/ui/patterns/QuantityStepper';
import { StickyActionBar } from '@smartapp/ui/patterns/StickyActionBar';

import { RewardSwitch } from '../members/RewardSwitch';
import { useReward } from '../members/use-reward';
import { useShop } from '../shell/ShopProvider';

const words = WORDS.storefront.cart;

/** The cart: lines with quantity and remove, the subtotal, and "Checkout · ₱345". */
export function CartSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { storefront, cart, catalogLabel, setQty, removeLine } = useShop();
  const reward = useReward();
  const discount = reward.discount(cart.subtotal);
  const total = cart.subtotal - discount;
  const base = `/${storefront.shop.slug}`;
  const close = () => {
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} desktop="right">
      <ResponsiveDialogContent className="gap-4 px-4 pb-0 sm:max-w-md">
        <ResponsiveDialogHeader className="px-0 text-left">
          <ResponsiveDialogTitle>{words.title}</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        {cart.lines.length === 0 ? (
          <Empty className="pb-8">
            <EmptyHeader>
              <EmptyMedia>
                <img src={FLUENT_ICONS['shopping-bags'].url} alt="" className="size-16" />
              </EmptyMedia>
              <EmptyTitle>{words.empty}</EmptyTitle>
            </EmptyHeader>
            <EmptyContent>
              <Link href={`${base}/menu`} onClick={close} className={cn(buttonVariants({ variant: 'outline' }))}>
                {words.seeCatalog(catalogLabel)}
              </Link>
            </EmptyContent>
          </Empty>
        ) : (
          <>
            <OrderLines
              lines={cart.lines.map((priced) => ({
                itemName: priced.itemName,
                variantName: priced.variantName,
                qty: priced.line.qty,
                lineTotal: priced.lineTotal,
                note: priced.line.note,
                options: priced.options,
              }))}
              words={WORDS.order}
              renderLineActions={(index) => {
                const priced = cart.lines[index];
                if (!priced) return null;
                return (
                  <>
                    {priced.available ? (
                      <QuantityStepper
                        size="sm"
                        value={priced.line.qty}
                        max={CART_QTY_MAX}
                        onChange={(qty) => {
                          setQty(index, qty);
                        }}
                        words={WORDS.shared}
                      />
                    ) : (
                      <span className="mr-auto text-sm font-medium text-destructive">{words.unavailable}</span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={words.remove(priced.itemName)}
                      onClick={() => {
                        removeLine(index);
                      }}
                    >
                      <IconTrash />
                    </Button>
                  </>
                );
              }}
            />
            <div className="flex items-center justify-between gap-3 border-t pt-3 text-base font-bold">
              <span>{WORDS.order.subtotal}</span>
              <Money amount={cart.subtotal} />
            </div>
            {discount > 0 && (
              <div className="-mt-2 flex items-center justify-between gap-3 text-sm text-member-text">
                <span>{WORDS.storefront.stamps.discount}</span>
                <Money amount={-discount} />
              </div>
            )}
            <RewardSwitch showJoin />
            {cart.hasUnavailable && (
              <Alert variant="destructive">
                <AlertDescription>{words.removeUnavailable}</AlertDescription>
              </Alert>
            )}
            <StickyActionBar className="-mx-4">
              {cart.hasUnavailable ? (
                <Button size="lg" variant="shop" className="flex-1" disabled>
                  {words.checkout(formatPeso(total))}
                </Button>
              ) : (
                <Link href={`${base}/checkout`} onClick={close} className={cn(buttonVariants({ variant: 'shop', size: 'lg' }), 'flex-1')}>
                  <span className="tabular">{words.checkout(formatPeso(total))}</span>
                </Link>
              )}
            </StickyActionBar>
          </>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
