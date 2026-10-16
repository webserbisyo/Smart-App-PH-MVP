import { useId, useState } from 'react';

import { AppSidebar as Sidebar07 } from '@smartapp/ui/blocks/app-sidebar';
import { ChartPieDonutText } from '@smartapp/ui/blocks/chart-pie-donut-text';
import { LoginForm } from '@smartapp/ui/blocks/login-form';
import { SignupForm } from '@smartapp/ui/blocks/signup-form';
import { Button } from '@smartapp/ui/components/button';
import {
  ColorPicker,
  ColorPickerArea,
  ColorPickerContent,
  ColorPickerHueSlider,
  ColorPickerInput,
  ColorPickerSwatch,
  ColorPickerTrigger,
} from '@smartapp/ui/components/color-picker';
import { ConfettiButton } from '@smartapp/ui/components/confetti';
import { Banner, BannerClose, BannerDescription, BannerTitle } from '@smartapp/ui/components/banner';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@smartapp/ui/components/carousel';
import { Cropper, CropperArea, CropperImage } from '@smartapp/ui/components/cropper';
import { DotPattern } from '@smartapp/ui/components/dot-pattern';
import { Label } from '@smartapp/ui/components/label';
import { MaskInput } from '@smartapp/ui/components/mask-input';
import { NumberTicker } from '@smartapp/ui/components/number-ticker';
import { Timeline, TimelineContent, TimelineDate, TimelineHeader, TimelineIndicator, TimelineItem, TimelineSeparator, TimelineTitle } from '@smartapp/ui/components/reui/timeline';
import { ShineBorder } from '@smartapp/ui/components/shine-border';
import { SidebarProvider } from '@smartapp/ui/components/sidebar';
import { Sortable, SortableContent, SortableItem, SortableItemHandle } from '@smartapp/ui/components/sortable';
import { useFileUpload } from '@smartapp/ui/hooks/use-file-upload';
import { IconGripVertical, IconUpload, IconX } from '@smartapp/ui/icons';

import { DataGridDemo } from './DataGridDemo';
import { Demo } from './Demo';

// Sample text here is kit-only demo content (a developer page), not app copy.

const STEPS = [
  { step: 1, title: 'Placed', date: '9:02 AM' },
  { step: 2, title: 'Preparing', date: '9:05 AM' },
  { step: 3, title: 'Ready', date: '9:14 AM' },
];

function SortableDemo() {
  const [items, setItems] = useState(['Coffee', 'Milk tea', 'Pastries', 'Rice meals']);
  return (
    <Sortable value={items} onValueChange={setItems} orientation="vertical">
      <SortableContent className="flex w-full max-w-sm flex-col gap-2">
        {items.map((item) => (
          <SortableItem key={item} value={item} className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-card px-3">
            <SortableItemHandle render={<Button variant="ghost" size="icon-sm" aria-label={`Move ${item}`} />}>
              <IconGripVertical />
            </SortableItemHandle>
            <span className="text-sm">{item}</span>
          </SortableItem>
        ))}
      </SortableContent>
    </Sortable>
  );
}

function FileUploadHookDemo() {
  const [fileUploadState, { openFileDialog, removeFile, getInputProps, handleDragEnter, handleDragLeave, handleDragOver, handleDrop }] = useFileUpload({
    maxFiles: 1,
    accept: 'image/*',
  });

  return (
    <div className="w-full max-w-sm space-y-2">
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={openFileDialog}
        className={`flex flex-col items-center gap-2 rounded-xl border border-dashed p-6 text-center text-sm transition-colors cursor-pointer ${
          fileUploadState.isDragging ? 'border-primary bg-primary/5' : 'border-border'
        }`}
      >
        <input {...getInputProps()} />
        <IconUpload className="size-6 text-muted-foreground" />
        <span>Drop a product photo or click to browse</span>
        <Button variant="outline" size="sm" type="button">
          Choose photo
        </Button>
      </div>
      {fileUploadState.files.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3 text-sm">
          <span className="truncate">{fileUploadState.files[0]?.file.name}</span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              const fileId = fileUploadState.files[0]?.id;
              if (fileId) removeFile(fileId);
            }}
            aria-label="Remove"
          >
            <IconX />
          </Button>
        </div>
      )}
    </div>
  );
}

function CropperDemo() {
  return (
    <div className="relative h-64 w-full max-w-sm overflow-hidden rounded-xl border border-border bg-muted">
      <Cropper aspectRatio={1} shape="circle">
        <CropperImage src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><rect width='400' height='400' fill='%2308775f'/><circle cx='200' cy='200' r='120' fill='%23f9c635'/></svg>" alt="Sample" />
        <CropperArea />
      </Cropper>
    </div>
  );
}

function BannerDemo() {
  return (
    <div className="w-full max-w-md space-y-3">
      <Banner variant="info">
        <BannerTitle>Store open</BannerTitle>
        <BannerDescription>Now accepting delivery and pickup orders.</BannerDescription>
        <BannerClose />
      </Banner>
      <Banner variant="warning">
        <BannerTitle>Limited stocks</BannerTitle>
        <BannerDescription>Ube Cheese Pandesal is selling fast today.</BannerDescription>
      </Banner>
    </div>
  );
}

function CarouselDemo() {
  return (
    <Carousel className="w-full max-w-xs">
      <CarouselContent>
        {['Juan Barako', 'Spanish Latte', 'Ube Halaya Cake'].map((item) => (
          <CarouselItem key={item}>
            <div className="flex aspect-square items-center justify-center rounded-xl border border-border bg-card p-6">
              <span className="text-base font-semibold">{item}</span>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
}

function DotPatternDemo() {
  return (
    <div className="relative flex h-48 w-full max-w-sm items-center justify-center overflow-hidden rounded-xl border border-border bg-background p-6">
      <DotPattern className="[mask-image:radial-gradient(180px_circle_at_center,white,transparent)]" />
      <span className="z-10 text-sm font-medium">Background Dot Pattern</span>
    </div>
  );
}

function ShineBorderDemo() {
  return (
    <div className="relative flex h-32 w-full max-w-sm items-center justify-center overflow-hidden rounded-xl border border-border bg-card p-6">
      <ShineBorder shineColor={['#2456d3', '#08775f', '#f9c635']} />
      <span className="z-10 text-sm font-semibold">Special Reward Card</span>
    </div>
  );
}

function MaskInputDemo() {
  const id = useId();
  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      <Label htmlFor={id}>Mobile number</Label>
      <MaskInput id={id} mask={{ pattern: '+63 9## ### ####' }} inputMode="tel" autoComplete="tel" placeholder="+63 9XX XXX XXXX" />
    </div>
  );
}

function ColorPickerDemo() {
  const [color, setColor] = useState('#2456d3');
  return (
    <ColorPicker value={color} onValueChange={setColor}>
      <ColorPickerTrigger render={<Button variant="outline" className="gap-2" />}>
        <ColorPickerSwatch className="size-5 rounded-md" />
        <span className="tabular">{color}</span>
      </ColorPickerTrigger>
      <ColorPickerContent>
        <ColorPickerArea />
        <ColorPickerHueSlider />
        <ColorPickerInput />
      </ColorPickerContent>
    </ColorPicker>
  );
}

/** Blocks, ReUI, DiceUI and Magic UI, each in light and dark. */
export function RichDemos() {
  return (
    <>
      <Demo name="chart · block chart-pie-donut-text">{() => <ChartPieDonutText />}</Demo>
      <Demo name="block sidebar-07 (starting point of our sidebar)">
        {() => (
          <SidebarProvider className="min-h-0 overflow-hidden rounded-lg border border-border">
            <Sidebar07 collapsible="none" className="h-96" />
          </SidebarProvider>
        )}
      </Demo>
      <Demo name="block login-03">{() => <LoginForm className="w-full max-w-sm" />}</Demo>
      <Demo name="block signup-03">{() => <SignupForm className="w-full max-w-sm" />}</Demo>
      <Demo name="ReUI data-grid">{() => <DataGridDemo />}</Demo>
      <Demo name="ReUI timeline">
        {() => (
          <Timeline defaultValue={2}>
            {STEPS.map((item) => (
              <TimelineItem key={item.step} step={item.step}>
                <TimelineHeader>
                  <TimelineSeparator />
                  <TimelineDate>{item.date}</TimelineDate>
                  <TimelineTitle>{item.title}</TimelineTitle>
                  <TimelineIndicator />
                </TimelineHeader>
                <TimelineContent>Order #1042</TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        )}
      </Demo>
      <Demo name="DiceUI sortable">{() => <SortableDemo />}</Demo>
      <Demo name="ReUI use-file-upload">{() => <FileUploadHookDemo />}</Demo>
      <Demo name="DiceUI cropper">{() => <CropperDemo />}</Demo>
      <Demo name="DiceUI banner">{() => <BannerDemo />}</Demo>
      <Demo name="shadcn carousel">{() => <CarouselDemo />}</Demo>
      <Demo name="Magic UI dot-pattern">{() => <DotPatternDemo />}</Demo>
      <Demo name="Magic UI shine-border">{() => <ShineBorderDemo />}</Demo>
      <Demo name="DiceUI mask-input">{() => <MaskInputDemo />}</Demo>
      <Demo name="DiceUI color-picker">{() => <ColorPickerDemo />}</Demo>
      <Demo name="Magic UI confetti (marigold: celebrations only)">
        {() => (
          <ConfettiButton className="bg-highlight text-highlight-foreground hover:bg-highlight-hover" options={{ colors: ['#f9c635', '#08775f', '#2456d3'] }}>
            Stamp card complete!
          </ConfettiButton>
        )}
      </Demo>
      <Demo name="Magic UI number-ticker">
        {() => (
          <p className="tabular text-3xl font-bold">
            ₱<NumberTicker value={4280} />
          </p>
        )}
      </Demo>
    </>
  );
}
