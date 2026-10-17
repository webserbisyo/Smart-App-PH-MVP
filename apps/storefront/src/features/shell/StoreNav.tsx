'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useMyOrderTokens } from '@smartapp/api';
import { formatPeso, WORDS } from '@smartapp/core';
import type { Fulfillment } from '@smartapp/core';
import { useKeyboardOpen } from '@smartapp/ui/hooks/use-keyboard-open';
import {
  IconBuildingStore,
  IconGift,
  IconGiftFilled,
  IconHome,
  IconHomeFilled,
  IconReceipt,
  IconReceiptFilled,
} from '@smartapp/ui/icons';
import type { ShellNavItem } from '@smartapp/ui/lib/nav';
import { AreaPill, type AreaChoice } from '@smartapp/ui/patterns/AreaPill';
import { CartBar } from '@smartapp/ui/patterns/CartBar';
import { DesktopNav } from '@smartapp/ui/patterns/DesktopNav';
import { OfflineBanner } from '@smartapp/ui/patterns/OfflineBanner';
import { StoreTabBar } from '@smartapp/ui/patterns/StoreTabBar';
import { StoreTopBar } from '@smartapp/ui/patterns/StoreTopBar';

import { UpdatesSheet } from '../orders/UpdatesSheet';
import { useShop } from './ShopProvider';

const words = WORDS.storefront;

function isFulfillment(val: unknown): val is Fulfillment {
  return val === 'pickup' || val === 'delivery' || val === 'walk_in';
}

function readAreaChoice(slug: string, defaultType: Fulfillment): AreaChoice {
  if (typeof window === 'undefined') return { fulfillment: defaultType };
  try {
    const raw = localStorage.getItem(`smartapp_area_${slug}`);
    if (!raw) return { fulfillment: defaultType };
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) {
      const f = 'fulfillment' in parsed ? parsed.fulfillment : undefined;
      const z = 'zoneId' in parsed ? parsed.zoneId : undefined;
      const fulfillment = isFulfillment(f) ? f : defaultType;
      const zoneId = typeof z === 'string' ? z : null;
      return { fulfillment, zoneId };
    }
    return { fulfillment: defaultType };
  } catch {
    return { fulfillment: defaultType };
  }
}

function saveAreaChoice(slug: string, choice: AreaChoice) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`smartapp_area_${slug}`, JSON.stringify(choice));
  } catch {}
}

export interface StoreNavProps {
  slug: string;
  shopName: string;
  /** "Menu" or "Products" (VOCAB). */
  catalogLabel: string;
}

/**
 * Storefront shell navigation:
 * Phone: StoreTopBar (56px) + floating CartBar (56px) + floating dock StoreTabBar (64px).
 * Desktop (1024px+): DesktopNav (64px).
 * Sets data-keyboard so floating bars hide while typing.
 */
export function StoreNav({ slug, shopName, catalogLabel }: StoreNavProps) {
  const pathname = usePathname();
  const { storefront, media, block, cart, added, openCart, setDetectedPin } = useShop();
  const keyboardOpen = useKeyboardOpen();
  const [updatesOpen, setUpdatesOpen] = useState(false);
  const deviceTokens = useMyOrderTokens(slug);

  const base = `/${slug}`;
  const settings = storefront.shop.settings;
  const logoPath = settings.logoPath;
  const logoUrl = logoPath ? (media[logoPath]?.thumb ?? media[logoPath]?.full ?? null) : null;

  const availableTypes: Fulfillment[] = [];
  if (settings.pickupEnabled) availableTypes.push('pickup');
  if (settings.deliveryEnabled) availableTypes.push('delivery');
  if (settings.walkInEnabled) availableTypes.push('walk_in');
  if (availableTypes.length === 0) availableTypes.push('pickup');

  const defaultType = availableTypes[0] ?? 'pickup';
  const [areaChoice, setAreaChoice] = useState<AreaChoice>(() => readAreaChoice(slug, defaultType));

  const handleAreaChoice = (choice: AreaChoice) => {
    setAreaChoice(choice);
    saveAreaChoice(slug, choice);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-keyboard', keyboardOpen ? 'open' : 'closed');
  }, [keyboardOpen]);

  const hasRewards = storefront.stampRule !== null;
  const cartText = words.cart.bar(cart.count, formatPeso(cart.subtotal));

  // 4 tabs: Home, Menu/Products, Rewards (if stamp card active), Orders
  const entries = [
    { key: 'home', href: base, label: words.nav.home, icon: <IconHome />, activeIcon: <IconHomeFilled /> },
    { key: 'menu', href: `${base}/menu`, label: catalogLabel, icon: <IconBuildingStore />, activeIcon: <IconBuildingStore stroke={2.5} /> },
    ...(hasRewards
      ? [{ key: 'rewards', href: `${base}/rewards`, label: 'Rewards', icon: <IconGift />, activeIcon: <IconGiftFilled /> }]
      : []),
    { key: 'orders', href: `${base}/orders`, label: words.nav.orders, icon: <IconReceipt />, activeIcon: <IconReceiptFilled /> },
  ];

  const tabBarItems: (ShellNavItem & { href: string })[] = entries.map((entry) => ({
    ...entry,
    link: <Link href={entry.href} />,
    active: entry.href === base ? pathname === base : pathname.startsWith(entry.href),
  }));

  const isCheckoutOrReceipt = pathname.endsWith('/checkout') || pathname.includes('/receipt') || pathname.includes('/o/');
  const showCartBar = cart.count > 0 && !isCheckoutOrReceipt;

  const areaPillNode = (
    <AreaPill
      fulfillment={areaChoice.fulfillment}
      availableTypes={availableTypes}
      zones={storefront.deliveryZones}
      selectedZoneId={areaChoice.zoneId}
      onChoiceChange={handleAreaChoice}
      onLocationPin={setDetectedPin}
    />
  );

  return (
    <div data-keyboard={keyboardOpen ? 'open' : 'closed'}>
      {/* Offline banner */}
      <OfflineBanner text={WORDS.shared.offline} />

      {/* Desktop navigation (1024 px and up) */}
      <DesktopNav
        name={shopName}
        logoUrl={logoUrl}
        baseHref={base}
        items={tabBarItems}
        areaPill={areaPillNode}
        onOpenUpdates={() => {
          setUpdatesOpen(true);
        }}
        updateCount={deviceTokens.length}
        accountHref={`${base}/account`}
        cartText={cartText}
        cartCount={cart.count}
        onOpenCart={openCart}
        addedCount={added}
      />

      {/* Phone / Tablet header (under 1024 px) */}
      <StoreTopBar
        name={shopName}
        logoUrl={logoUrl}
        isOpen={block === null}
        statusText={block?.short}
        accountHref={`${base}/account`}
        onOpenUpdates={() => {
          setUpdatesOpen(true);
        }}
        updateCount={deviceTokens.length}
        areaPill={areaPillNode}
      />

      {/* Phone / Tablet bottom bars */}
      <div className="lg:hidden">
        {showCartBar && (
          <CartBar
            key={added}
            text={cartText}
            total={formatPeso(cart.subtotal)}
            onClick={openCart}
            aria-label={`${words.cart.open}: ${cartText}`}
          />
        )}
        <StoreTabBar label={words.nav.label} items={tabBarItems} />
      </div>

      {/* Updates sheet from bell */}
      <UpdatesSheet
        slug={slug}
        open={updatesOpen}
        onOpenChange={setUpdatesOpen}
      />
    </div>
  );
}
