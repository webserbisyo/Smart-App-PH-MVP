'use client';

import {
  IconBrandFacebook,
  IconBrandMessenger,
  IconClock,
  IconExternalLink,
  IconMapPin,
  IconPhone,
} from '@tabler/icons-react';

import { formatTimeOfDay, type WeekdayHours } from '@smartapp/core';
import { Card, CardContent } from '#components/card';
import { cn } from '#lib/utils';

export interface ShopInfoListProps {
  /** Weekly business hours from the database (weekday 0 = Sunday). */
  hours?: readonly WeekdayHours[] | undefined;
  /** Shop phone number (shown as tel:). */
  phone?: string | null | undefined;
  /** Street address. */
  address?: string | null | undefined;
  /** City or municipality. */
  city?: string | null | undefined;
  /** Facebook page or profile URL. */
  facebookUrl?: string | null | undefined;
  /** Facebook Messenger username. */
  messengerUsername?: string | null | undefined;
  className?: string | undefined;
}

const WEEKDAYS = [
  { weekday: 1, name: 'Monday' },
  { weekday: 2, name: 'Tuesday' },
  { weekday: 3, name: 'Wednesday' },
  { weekday: 4, name: 'Thursday' },
  { weekday: 5, name: 'Friday' },
  { weekday: 6, name: 'Saturday' },
  { weekday: 0, name: 'Sunday' },
] as const;

/**
 * ShopInfoList pattern:
 * Shows hours for the week with today bold, phone as tel:,
 * address, Google Maps link, Facebook, Messenger.
 * Rows are hidden when empty.
 */
export function ShopInfoList({
  hours = [],
  phone,
  address,
  city,
  facebookUrl,
  messengerUsername,
  className,
}: ShopInfoListProps) {
  const fullAddress = [address, city].filter(Boolean).join(', ');
  const mapUrl = fullAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`
    : null;

  // Manila timezone or local weekday (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const todayWeekday = new Date().getDay();

  const hasHours = hours.length > 0;
  const hasContact = Boolean(phone || fullAddress || facebookUrl || messengerUsername);

  if (!hasHours && !hasContact) return null;

  return (
    <Card className={cn('border-shop-30-foreground/10 bg-shop-30/70 shadow-xs backdrop-blur', className)}>
      <CardContent className="p-4 sm:p-5 flex flex-col gap-5 text-sm">
        {/* Weekly Hours */}
        {hasHours && (
          <section aria-labelledby="shop-hours-title" className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <IconClock className="size-4 text-shop-10 shrink-0" />
              <h3 id="shop-hours-title" className="text-sm">
                Opening Hours
              </h3>
            </div>

            <ul className="flex flex-col gap-1.5 pl-6 text-xs sm:text-sm">
              {WEEKDAYS.map(({ weekday, name }) => {
                const dayHours = hours.find((h) => h.weekday === weekday);
                const isToday = weekday === todayWeekday;

                return (
                  <li
                    key={weekday}
                    className={cn(
                      'flex items-center justify-between py-0.5',
                      isToday
                        ? 'font-bold text-foreground'
                        : 'text-shop-30-foreground/75',
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      {name}
                      {isToday && (
                        <span className="inline-block size-1.5 rounded-full bg-shop-10" />
                      )}
                    </span>
                    <span className="tabular">
                      {dayHours
                        ? `${formatTimeOfDay(dayHours.opensAt)} – ${formatTimeOfDay(dayHours.closesAt)}`
                        : 'Closed'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Contact & Location */}
        {hasContact && (
          <section
            aria-labelledby="shop-contact-title"
            className={cn('flex flex-col gap-2.5', hasHours && 'pt-3 border-t border-shop-30-foreground/10')}
          >
            <h3 id="shop-contact-title" className="sr-only">
              Contact and Location
            </h3>

            {phone && (
              <div className="flex items-center gap-2.5">
                <IconPhone className="size-4 text-shop-10 shrink-0" />
                <a
                  href={`tel:${phone}`}
                  className="font-medium text-shop-30-foreground hover:text-shop-10 hover:underline"
                >
                  {phone}
                </a>
              </div>
            )}

            {fullAddress && (
              <div className="flex items-start gap-2.5">
                <IconMapPin className="size-4 text-shop-10 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-shop-30-foreground">{fullAddress}</span>
                  {mapUrl && (
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-shop-10 hover:underline"
                    >
                      <span>Open in Maps</span>
                      <IconExternalLink className="size-3" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {facebookUrl && (
              <div className="flex items-center gap-2.5">
                <IconBrandFacebook className="size-4 text-shop-10 shrink-0" />
                <a
                  href={facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-shop-30-foreground hover:text-shop-10 hover:underline inline-flex items-center gap-1"
                >
                  <span>Facebook Page</span>
                  <IconExternalLink className="size-3 text-muted-foreground" />
                </a>
              </div>
            )}

            {messengerUsername && (
              <div className="flex items-center gap-2.5">
                <IconBrandMessenger className="size-4 text-shop-10 shrink-0" />
                <a
                  href={`https://m.me/${encodeURIComponent(messengerUsername)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-shop-30-foreground hover:text-shop-10 hover:underline inline-flex items-center gap-1"
                >
                  <span>Chat on Messenger</span>
                  <IconExternalLink className="size-3 text-muted-foreground" />
                </a>
              </div>
            )}
          </section>
        )}
      </CardContent>
    </Card>
  );
}
