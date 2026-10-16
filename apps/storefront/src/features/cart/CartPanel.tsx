'use client';

import Link from 'next/link';

import { CART_QTY_MAX, formatPeso, WORDS } from '@smartapp/core';
import { Alert, AlertDescription } from '@smartapp/ui/components/alert';
import { Button, buttonVariants } from '@smartapp/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@smartapp/ui/components/card';
import { IconShoppingBag, IconTrash } from '@smartapp/ui/icons';
import { cn } from '@smartapp/ui/lib/utils';
import { Money } from '@smartapp/ui/patterns/Money';
import { OrderLines } from '@smartapp/ui/patterns/OrderLines';
import { QuantityStepper } from '@smartapp/ui/patterns/QuantityStepper';

import { RewardSwitch } from '../members/RewardSwitch';
import { useReward } from '../members/use-reward';
import { useShop } from '../shell/ShopProvider';

const words = WORDS.storefront.cart;

/**
 * Desktop cart panel:
 * Fixed 360 px wide sticky panel shown on 1280 px and up screens on the Menu page.
 */
export function CartPanel({ className }: { className?: string }) {
  const { storefront, cart, setQty, removeLine } = useShop();
  const reward = useReward();
  const discount = reward.discount(cart.subtotal);
  const total = cart.subtotal - discount;
  const base = `/${storefront.shop.slug}`;

  return (
    <Card
      className={cn(
        'w-[360px] shrink-0 border-shop-30-foreground/10 bg-shop-30/90 shadow-sm backdrop-blur',
        className,
      )}
    >
      <CardHeader className="pb-3 border-b border-shop-30-foreground/10 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <IconShoppingBag className="size-4 text-shop-10" />
          <span>{words.title}</span>
        </CardTitle>
        <span className="rounded-full bg-shop-10-soft px-2.5 py-0.5 text-xs font-bold text-shop-10 tabular">
          {cart.count}
        </span>
      </CardHeader>

      <CardContent className="p-4 flex flex-col gap-4">
        {cart.lines.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
            <IconShoppingBag className="size-10 stroke-1 opacity-30" />
            <p className="text-sm font-semibold text-foreground/80">{words.empty}</p>
            <p className="text-xs">Add items from the menu to start your order.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="max-h-[calc(100vh-22rem)] overflow-y-auto pr-1">
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
            </div>

            <div className="flex flex-col gap-2 border-t border-shop-30-foreground/10 pt-3">
              <div className="flex items-center justify-between text-sm font-medium">
                <span>{WORDS.order.subtotal}</span>
                <Money amount={cart.subtotal} />
              </div>

              {discount > 0 && (
                <div className="flex items-center justify-between text-sm text-member-text font-medium">
                  <span>{WORDS.storefront.stamps.discount}</span>
                  <Money amount={-discount} />
                </div>
              )}

              <RewardSwitch showJoin />

              {cart.hasUnavailable && (
                <Alert variant="destructive" className="mt-1">
                  <AlertDescription>{words.removeUnavailable}</AlertDescription>
                </Alert>
              )}

              <div className="pt-2">
                {cart.hasUnavailable ? (
                  <Button size="lg" variant="shop" className="w-full font-bold" disabled>
                    {words.checkout(formatPeso(total))}
                  </Button>
                ) : (
                  <Link
                    href={`${base}/checkout`}
                    className={cn(buttonVariants({ variant: 'shop', size: 'lg' }), 'w-full font-bold')}
                  >
                    <span className="tabular">{words.checkout(formatPeso(total))}</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
