'use client';

import { useState } from 'react';
import { IconBike, IconBuildingStore, IconChevronDown, IconMapPin, IconWalk } from '@tabler/icons-react';

import { findNearestZone, formatPeso, WORDS } from '@smartapp/core';
import type { Fulfillment, Pin } from '@smartapp/core';
import { Button } from '#components/button';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '#components/responsive-dialog';
import { Spinner } from '#components/spinner';
import { cn } from '#lib/utils';

export interface DeliveryZoneChoice {
  id: string;
  name: string;
  fee: number;
  minOrderTotal?: number | null | undefined;
  etaMinutes?: number | null | undefined;
  centerLat?: number | null | undefined;
  centerLng?: number | null | undefined;
  center?: Pin | null | undefined;
  isActive?: boolean | undefined;
}

export interface AreaChoice {
  fulfillment: Fulfillment;
  zoneId?: string | null | undefined;
}

export interface AreaPillProps {
  fulfillment: Fulfillment;
  availableTypes: readonly Fulfillment[];
  zones?: readonly DeliveryZoneChoice[] | undefined;
  selectedZoneId?: string | null | undefined;
  onChoiceChange: (choice: AreaChoice) => void;
  onLocationPin?: ((pin: Pin) => void) | undefined;
  className?: string | undefined;
}

const TYPE_ICONS: Record<Fulfillment, typeof IconBike> = {
  pickup: IconBuildingStore,
  delivery: IconBike,
  walk_in: IconWalk,
};

/**
 * AreaPill and Area sheet: displays current order method (Pickup / Delivery / Walk-in)
 * and opens a responsive sheet to pick fulfillment type and delivery zones.
 */
export function AreaPill({
  fulfillment,
  availableTypes,
  zones = [],
  selectedZoneId,
  onChoiceChange,
  onLocationPin,
  className,
}: AreaPillProps) {
  const [open, setOpen] = useState(false);
  const [draftType, setDraftType] = useState<Fulfillment>(fulfillment);
  const [draftZoneId, setDraftZoneId] = useState<string | null>(selectedZoneId ?? null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [suggestedZoneId, setSuggestedZoneId] = useState<string | null>(null);

  const selectedZone = zones.find((z) => z.id === (selectedZoneId ?? undefined));
  const TypeIcon = TYPE_ICONS[fulfillment];

  let pillLabel: string = WORDS.order.fulfillment[fulfillment];
  if (fulfillment === 'delivery' && selectedZone) {
    pillLabel = `${WORDS.order.fulfillment.delivery} · ${selectedZone.name}`;
  }

  const handleUseLocation = () => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setLocError(WORDS.storefront.area.locationError);
      return;
    }
    setLocating(true);
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const userPin: Pin = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyMeters: pos.coords.accuracy,
        };
        onLocationPin?.(userPin);
        const nearest = findNearestZone(zones, userPin);
        if (nearest) {
          setDraftZoneId(nearest.zone.id);
          setSuggestedZoneId(nearest.zone.id);
        }
      },
      () => {
        setLocating(false);
        setLocError(WORDS.storefront.area.locationError);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  const handleOpen = () => {
    setDraftType(fulfillment);
    setDraftZoneId(selectedZoneId ?? null);
    setLocError(null);
    setSuggestedZoneId(null);
    setOpen(true);
  };

  const handleSave = () => {
    onChoiceChange({ fulfillment: draftType, zoneId: draftType === 'delivery' ? draftZoneId : null });
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label={`Order method: ${pillLabel}`}
        className={cn(
          'pressable inline-flex h-8 max-w-44 items-center gap-1 rounded-full border border-shop-30-foreground/15 bg-shop-30 px-2.5 text-xs font-semibold text-shop-30-foreground hover:bg-shop-10-soft outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors duration-fast',
          className,
        )}
      >
        <TypeIcon className="size-3.5 shrink-0 text-shop-10" aria-hidden="true" />
        <span className="truncate">{pillLabel}</span>
        <IconChevronDown className="size-3 shrink-0 opacity-60" aria-hidden="true" />
      </button>

      <ResponsiveDialog open={open} onOpenChange={setOpen} breakpoint={1024}>
        <ResponsiveDialogContent className="max-w-md p-4 flex flex-col gap-4">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="text-lg font-bold">
              How would you like your order?
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription className="text-sm text-muted-foreground">
              Choose your order method and delivery zone.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          {/* Fulfillment type options */}
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Order method">
            {availableTypes.map((type) => {
              const Icon = TYPE_ICONS[type];
              const isSelected = draftType === type;
              return (
                <button
                  key={type}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => {
                    setDraftType(type);
                    if (type === 'delivery' && !draftZoneId && zones.length > 0) {
                      setDraftZoneId(zones[0]?.id ?? null);
                    }
                  }}
                  className={cn(
                    'pressable flex flex-col items-center justify-center gap-1 rounded-xl border p-3 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all',
                    isSelected
                      ? 'border-shop-10 bg-shop-10-soft text-shop-10'
                      : 'border-border bg-card text-foreground hover:bg-muted',
                  )}
                >
                  <Icon className="size-5" aria-hidden="true" />
                  <span>{WORDS.order.fulfillment[type]}</span>
                </button>
              );
            })}
          </div>

          {/* Delivery zones list when delivery is chosen */}
          {draftType === 'delivery' && (
            <div className="flex flex-col gap-2 pt-2 border-t">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Delivery Zones
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={locating}
                  onClick={handleUseLocation}
                  className="h-7 gap-1 px-2 text-xs font-semibold text-shop-10 hover:text-shop-10 hover:bg-shop-10-soft"
                >
                  {locating ? <Spinner className="size-3" /> : <IconMapPin className="size-3.5" aria-hidden="true" />}
                  <span>{WORDS.storefront.area.useCurrentLocation}</span>
                </Button>
              </div>
              {locError && <p className="text-xs text-destructive-text">{locError}</p>}
              {zones.length === 0 ? (
                <p className="text-sm text-muted-foreground">No specific delivery zones configured.</p>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto">
                  {zones.map((zone) => {
                    const isSelected = draftZoneId === zone.id;
                    const isSuggested = suggestedZoneId === zone.id;
                    return (
                      <button
                        key={zone.id}
                        type="button"
                        onClick={() => {
                          setDraftZoneId(zone.id);
                        }}
                        className={cn(
                          'pressable flex items-center justify-between rounded-lg border p-2.5 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all',
                          isSelected
                            ? 'border-shop-10 bg-shop-10-soft font-semibold text-shop-10'
                            : 'border-border bg-card text-foreground hover:bg-muted',
                        )}
                      >
                        <div className="flex min-w-0 flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate">{zone.name}</span>
                            {isSuggested && (
                              <span className="rounded-full bg-shop-10/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-shop-10">
                                Suggested
                              </span>
                            )}
                          </div>
                          {zone.etaMinutes && (
                            <span className="text-xs text-muted-foreground">
                              ~{String(zone.etaMinutes)} mins
                            </span>
                          )}
                        </div>
                        <span className="tabular font-bold shrink-0">{formatPeso(zone.fee)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button type="button" variant="shop" onClick={handleSave}>
              Confirm
            </Button>
          </div>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
}
