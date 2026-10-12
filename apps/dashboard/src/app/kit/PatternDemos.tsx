import { useState } from 'react';

import { WORDS } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Input } from '@smartapp/ui/components/input';
import { Label } from '@smartapp/ui/components/label';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { Switch } from '@smartapp/ui/components/switch';
import { FLUENT_ICONS } from '@smartapp/ui/assets/fluent';
import { IMAGE_SIZES } from '@smartapp/ui/lib/compress-image';
import { CategoryIcon } from '@smartapp/ui/patterns/CategoryIcon';
import { CopyButton } from '@smartapp/ui/patterns/CopyButton';
import { Money } from '@smartapp/ui/patterns/Money';
import { OfflineBanner } from '@smartapp/ui/patterns/OfflineBanner';
import { PesoField } from '@smartapp/ui/patterns/PesoField';
import { PhoneField } from '@smartapp/ui/patterns/PhoneField';
import { PhotoField } from '@smartapp/ui/patterns/PhotoField';
import { ProductCard } from '@smartapp/ui/patterns/ProductCard';
import { QuantityStepper } from '@smartapp/ui/patterns/QuantityStepper';
import { QueryState } from '@smartapp/ui/patterns/QueryState';
import type { QueryStateKind } from '@smartapp/ui/patterns/QueryState';
import { SettingsSection } from '@smartapp/ui/patterns/SettingsSection';
import { ShareShop } from '@smartapp/ui/patterns/ShareShop';
import { ShopHeader } from '@smartapp/ui/patterns/ShopHeader';
import { StampCard } from '@smartapp/ui/patterns/StampCard';
import { StickyActionBar } from '@smartapp/ui/patterns/StickyActionBar';

import { Demo } from './Demo';

// Sample values here are kit-only demo content (a developer page), not app copy and not a mock data layer.

const shared = WORDS.shared;
const QUERY_STATES: readonly QueryStateKind[] = ['loading', 'empty', 'error', 'ready'];
const LONG_NAME = 'Kapihan ni Juan sa Kanto ng Mabini at Rizal Street, Barangay San Isidro';

function noop() {
  // Demo buttons do nothing.
}

function QueryStateDemo({ offline }: { offline: boolean }) {
  return (
    <div className="grid w-full gap-3 sm:grid-cols-2">
      {QUERY_STATES.map((state) => (
        <div key={state} className="flex min-w-0 flex-col gap-1">
          <span className="text-xs text-muted-foreground">{offline && state === 'error' ? 'error (offline)' : state}</span>
          <QueryState
            state={state}
            skeleton={
              <div className="flex flex-col gap-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-16 w-full" />
              </div>
            }
            empty={{
              media: <img src={FLUENT_ICONS.receipt.url} alt="" className="size-10" />,
              title: 'No orders yet',
              description: 'New orders show up here.',
              action: <Button size="sm">Share your shop</Button>,
            }}
            error={{ title: shared.loadFailed, retryLabel: shared.tryAgain, onRetry: noop }}
            offline={offline ? { title: shared.offlineShort } : null}
          >
            <p className="rounded-lg border border-border p-3 text-sm">Content is ready.</p>
          </QueryState>
        </div>
      ))}
    </div>
  );
}

function FieldsDemo() {
  const [qty, setQty] = useState(1);
  const [phone, setPhone] = useState<string | null>(null);
  const [price, setPrice] = useState<number | null>(12_000);
  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex items-center gap-4">
        <QuantityStepper value={qty} onChange={setQty} words={shared} />
        <QuantityStepper value={qty} onChange={setQty} words={shared} size="sm" />
      </div>
      <PhoneField label="Mobile number" value={phone} onChange={setPhone} words={shared} description={phone ?? 'Not a mobile number yet'} />
      <PesoField label="Price" value={price} onChange={setPrice} words={shared} description={price === null ? 'Empty' : `${String(price)} centavos`} />
      <div className="flex items-center gap-2">
        <CopyButton value="https://shop.webserbisyo.com/juans-cafe" words={shared} label={shared.share.copyLink} />
        <CopyButton value="REF 1234 5678" words={shared} />
      </div>
    </div>
  );
}

function PhotoFieldDemo({ shape }: { shape: 'square' | 'wide' }) {
  const [value, setValue] = useState<string | null>(null);
  const [fail, setFail] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  // A demo upload: no network, it only reports progress and keeps the compressed photo in the page.
  const upload = (blob: Blob, progress: (percent: number) => void) =>
    new Promise<string>((resolve, reject) => {
      setSent(`${blob.type}, ${String(Math.round(blob.size / 1024))} KB`);
      let percent = 0;
      const timer = window.setInterval(() => {
        percent += 20;
        progress(percent);
        if (percent < 100) return;
        window.clearInterval(timer);
        if (fail) reject(new Error('demo_failed'));
        else resolve(URL.createObjectURL(blob));
      }, 250);
    });

  return (
    <div className="flex w-full flex-col gap-3">
      <PhotoField
        label={shape === 'square' ? 'Shop logo (512 px square)' : 'Product photo (1600 px)'}
        value={value}
        upload={upload}
        onChange={setValue}
        compress={shape === 'square' ? IMAGE_SIZES.logo : IMAGE_SIZES.photo}
        words={shared.photo}
        shape={shape}
      />
      <p className="text-xs text-muted-foreground">Sent to the demo upload: {sent ?? 'nothing yet'}</p>
      <Label className="flex items-center gap-2 text-sm font-normal">
        <Switch checked={fail} onCheckedChange={setFail} />
        Make the next upload fail
      </Label>
    </div>
  );
}

function StampCardDemo({ celebrate }: { celebrate: boolean }) {
  const [renders, setRenders] = useState(0);
  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <StampCard stamps={0} goal={10} reward="a free drink" words={shared.stamps} />
      <StampCard stamps={7} goal={10} reward="a free drink" words={shared.stamps} />
      <StampCard stamps={10} goal={10} reward="a free drink" words={shared.stamps} celebrate={celebrate} />
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setRenders((count) => count + 1);
        }}
      >
        Re-render ({renders}): no new confetti
      </Button>
    </div>
  );
}

function SettingsSectionDemo() {
  const [name, setName] = useState("Juan's Cafe");
  const [saved, setSaved] = useState("Juan's Cafe");
  const [saving, setSaving] = useState(false);
  return (
    <SettingsSection
      title="Shop details"
      description="Type to see Save appear."
      dirty={name !== saved}
      saving={saving}
      words={shared}
      onSave={() => {
        setSaving(true);
        window.setTimeout(() => {
          setSaved(name);
          setSaving(false);
        }, 800);
      }}
      className="w-full max-w-md"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="kit-shop-name">Shop name</Label>
        <Input
          id="kit-shop-name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
        />
      </div>
    </SettingsSection>
  );
}

/** The shared patterns (P4.0), each in each state. */
export function PatternDemos() {
  return (
    <>
      <Demo name="Money">
        {() => (
          <div className="flex flex-wrap gap-4 text-lg">
            <Money amount={12_000} />
            <Money amount={123_450} />
            <Money amount={1_234_500} />
            <Money amount={12_000} cents="always" />
          </div>
        )}
      </Demo>

      <Demo name="QueryState">{() => <QueryStateDemo offline={false} />}</Demo>
      <Demo name="QueryState offline">{() => <QueryStateDemo offline />}</Demo>

      <Demo name="OfflineBanner">{() => <OfflineBanner text={shared.offline} offline className="rounded-lg border" />}</Demo>

      <Demo name="StickyActionBar">
        {() => (
          <div className="h-48 w-full overflow-y-auto rounded-lg border border-border">
            <div className="flex flex-col gap-2 p-3">
              {Array.from({ length: 8 }, (_, index) => (
                <p key={index} className="text-sm text-muted-foreground">
                  Form row {index + 1}
                </p>
              ))}
            </div>
            <StickyActionBar>
              <Button className="w-full">Place order</Button>
            </StickyActionBar>
          </div>
        )}
      </Demo>

      <Demo name="Fields: QuantityStepper, PhoneField, PesoField, CopyButton">{() => <FieldsDemo />}</Demo>

      <Demo name="CategoryIcon">
        {() => (
          <div className="flex flex-wrap items-center gap-3">
            <CategoryIcon icon={{ kind: 'fluent', key: 'coffee' }} label="Coffee" className="size-12" />
            <CategoryIcon icon={{ kind: 'fluent', key: 'tshirt' }} label="Shirts" className="size-12" />
            <CategoryIcon icon={{ kind: 'emoji', value: '🧋' }} label="Milk tea" className="size-12" />
            <CategoryIcon icon={{ kind: 'image', path: 'demo/croissant.webp' }} imageUrl={() => FLUENT_ICONS.croissant.url} label="Pastries" className="size-12" />
            <CategoryIcon icon={null} className="size-12" />
          </div>
        )}
      </Demo>

      <Demo name="PhotoField">
        {() => (
          <div className="grid w-full gap-6 sm:grid-cols-2">
            <PhotoFieldDemo shape="square" />
            <PhotoFieldDemo shape="wide" />
          </div>
        )}
      </Demo>

      <Demo name="StampCard: 0, 7 of 10, reward ready">{(theme) => <StampCardDemo celebrate={theme === 'light'} />}</Demo>

      <Demo name="ShopHeader">
        {() => (
          <div className="flex w-full flex-col gap-4">
            <ShopHeader
              name="Juan's Cafe"
              logoUrl={FLUENT_ICONS.coffee.url}
              tagline="Coffee and pastries, Mabini St."
              status={{ open: true, text: shared.shop.openUntil('9:00 PM') }}
              actions={<CopyButton value="https://shop.webserbisyo.com/juans-cafe" words={shared} />}
            />
            <ShopHeader name={LONG_NAME} logoUrl={null} status={{ open: false, text: shared.shop.closedOpensAt('7:00 AM') }} />
          </div>
        )}
      </Demo>

      <Demo name="ProductCard">
        {() => (
          <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
            <ProductCard name="Iced Latte" photoUrl={null} fallbackIcon={<CategoryIcon icon={{ kind: 'fluent', key: 'coffee' }} className="size-16" />} price={12_000} priceVaries words={shared.product} onOpen={noop} onAdd={noop} />
            <ProductCard name="Ensaymada" photoUrl={FLUENT_ICONS.croissant.url} fallbackIcon={null} price={6_500} words={shared.product} onOpen={noop} onAdd={noop} />
            <ProductCard name="Ube Cheese Pandesal Family Box with Extra Queso de Bola" photoUrl={null} fallbackIcon={<CategoryIcon icon={{ kind: 'fluent', key: 'bread' }} className="size-16" />} price={1_234_500} words={shared.product} onOpen={noop} onAdd={noop} />
            <ProductCard name="Tala Tee, Black" photoUrl={null} fallbackIcon={<CategoryIcon icon={{ kind: 'fluent', key: 'tshirt' }} className="size-16" />} price={45_000} soldOut words={shared.product} onOpen={noop} onAdd={noop} />
          </div>
        )}
      </Demo>

      <Demo name="SettingsSection">{() => <SettingsSectionDemo />}</Demo>

      <Demo name="ShareShop">
        {() => <ShareShop url="https://shop.webserbisyo.com/juans-cafe" shopName="Juan's Cafe" filename="juans-cafe" words={{ ...shared.share, copy: shared.copy, copied: shared.copied }} className="w-full max-w-sm" />}
      </Demo>
    </>
  );
}
