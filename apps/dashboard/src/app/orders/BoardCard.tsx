import { useShopSettings } from '@smartapp/api';
import { ageLabel, canCancel, distanceKm, formatManilaTime, isLate, mapsLink, minutesSince, nextActions, WORDS } from '@smartapp/core';
import type { BoardOrder, OrderAction, RuleSettings } from '@smartapp/core';
import { OrderCard } from '@smartapp/ui/patterns/OrderCard';
import type { OrderCardAction } from '@smartapp/ui/patterns/OrderCard';

import { useShop } from '../shop';

const words = WORDS.order;
const boardWords = WORDS.dashboard.orders;

export interface BoardCardProps {
  card: BoardOrder;
  settings: RuleSettings;
  now: Date;
  /** This card's step is saving. */
  pending: boolean;
  onStep: (action: OrderAction) => void;
  onOpen: () => void;
  onCancel: () => void;
  selected?: boolean;
  /** Home's In progress: no item lines, same buttons. */
  variant?: 'normal' | 'compact';
}

/** One order on the board: the steps come from `nextActions` (main step first), then Call and Cancel under "More". */
export function BoardCard({ card, settings, now, pending, onStep, onOpen, onCancel, selected = false, variant = 'normal' }: BoardCardProps) {
  const { order } = card;
  const steps: OrderCardAction[] = nextActions(order, settings).map((action, index) => ({
    key: action,
    label: words.action[action],
    onSelect: () => {
      onStep(action);
    },
    ...(index === 0 ? { pending } : {}),
  }));
  const extras: OrderCardAction[] = [
    {
      key: 'call',
      label: boardWords.call,
      onSelect: () => {
        window.location.href = `tel:${order.customerPhone}`;
      },
    },
    ...(canCancel(order) ? [{ key: 'cancel', label: boardWords.cancel, onSelect: onCancel }] : []),
  ];
  const timeText = order.pickupAt ? words.pickupAt(formatManilaTime(order.pickupAt)) : ageLabel(minutesSince(order.placedAt, now));
  const shop = useShop();
  const shopSettings = useShopSettings(shop.id);
  const settingsData = shopSettings.data;
  const shopPin =
    settingsData?.pin ??
    (settingsData !== undefined &&
    settingsData.shopLat !== null &&
    settingsData.shopLat !== undefined &&
    settingsData.shopLng !== null &&
    settingsData.shopLng !== undefined
      ? { lat: settingsData.shopLat, lng: settingsData.shopLng }
      : null);
  const orderPin =
    order.deliveryPin ??
    (order.deliveryLat !== null &&
    order.deliveryLat !== undefined &&
    order.deliveryLng !== null &&
    order.deliveryLng !== undefined
      ? { lat: order.deliveryLat, lng: order.deliveryLng }
      : null);

  const deliveryInfo = orderPin
    ? {
        mapUrl: mapsLink(orderPin),
        mapLabel: boardWords.detail.openInMaps,
        distance:
          shopPin !== null
            ? boardWords.detail.straightLineDistance(distanceKm(shopPin, orderPin).toFixed(1))
            : null,
      }
    : null;

  return (
    <OrderCard
      order={{ ...order, lines: card.lines }}
      actions={steps.length > 0 ? [...steps, ...extras] : []}
      timeText={timeText}
      late={isLate(order, now)}
      words={{ fulfillment: words.fulfillment, more: words.more, moreItems: words.moreItems }}
      onOpen={onOpen}
      variant={variant}
      deliveryInfo={deliveryInfo}
      {...(selected ? { className: 'ring-2 ring-primary' } : {})}
    />
  );
}
