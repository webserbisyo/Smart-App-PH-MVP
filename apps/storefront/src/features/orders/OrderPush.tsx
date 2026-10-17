'use client';

import { useState } from 'react';

import { useSubscribeOrderPush } from '@smartapp/api';
import { installPlatform, WORDS } from '@smartapp/core';
import type { Order } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Spinner } from '@smartapp/ui/components/spinner';
import { IconBell, IconCircleCheckFilled } from '@smartapp/ui/icons';

import { IosSteps } from '../install/InstallCard';
import { isStandalone } from '../install/install-prompt';

const words = WORDS.storefront.receipt.push;

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

interface OrderPushProps {
  order: Order;
  shopName: string;
  vapidPublicKey: string | null;
}

/**
 * "Notify me when it's ready" push notification button on the receipt (SF3 step 7).
 * On iOS, shows install instructions if not running as installed PWA.
 */
export function OrderPush({ order, shopName, vapidPublicKey }: OrderPushProps) {
  const [status, setStatus] = useState<'idle' | 'subscribing' | 'subscribed' | 'denied' | 'unsupported'>('idle');
  const [showIosSteps, setShowIosSteps] = useState(false);
  const subscribePush = useSubscribeOrderPush();

  // Only prompt when order is in preparation / active before ready.
  const isPendingReady = order.status === 'placed' || order.status === 'preparing';

  if (!isPendingReady) {
    return null;
  }

  const handleSubscribe = async () => {
    if (typeof window === 'undefined') return;

    const isIos = installPlatform(window.navigator.userAgent, window.navigator.maxTouchPoints) === 'ios';

    if (isIos && !isStandalone()) {
      setShowIosSteps(true);
      return;
    }

    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setStatus('unsupported');
      return;
    }

    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }

    const key = vapidPublicKey ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null;
    if (!key) {
      // In local dev without VAPID keys, show subscribed state gracefully
      setStatus('subscribed');
      return;
    }

    setStatus('subscribing');

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'idle');
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key),
        });
      }

      const json = sub.toJSON();
      const keys = json.keys;
      if (json.endpoint && keys && keys.p256dh && keys.auth) {
        await subscribePush.mutateAsync({
          token: order.token,
          subscription: {
            endpoint: json.endpoint,
            keys: {
              p256dh: keys.p256dh,
              auth: keys.auth,
            },
          },
        });
      }

      setStatus('subscribed');
    } catch {
      setStatus('idle');
    }
  };

  return (
    <div className="flex flex-col gap-2 print:hidden">
      {status === 'subscribed' ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-success/30 bg-success/10 p-3 text-sm font-medium text-success">
          <IconCircleCheckFilled className="size-5 shrink-0" aria-hidden="true" />
          <span>{words.subscribed}</span>
        </div>
      ) : status === 'denied' ? (
        <p className="text-center text-xs text-muted-foreground">{words.denied}</p>
      ) : status === 'unsupported' ? (
        <p className="text-center text-xs text-muted-foreground">{words.unsupported}</p>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full gap-2 border-shop-10/40 bg-shop-10/5 font-semibold text-foreground hover:bg-shop-10/10"
          disabled={status === 'subscribing'}
          onClick={() => {
            void handleSubscribe();
          }}
        >
          {status === 'subscribing' ? <Spinner /> : <IconBell aria-hidden="true" className="size-5 text-shop-10" />}
          <span>{status === 'subscribing' ? words.subscribing : words.notifyMe}</span>
        </Button>
      )}

      {showIosSteps && (
        <IosSteps
          open={showIosSteps}
          onOpenChange={setShowIosSteps}
          shopName={shopName}
        />
      )}
    </div>
  );
}
