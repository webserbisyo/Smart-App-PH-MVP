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
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadList,
  FileUploadTrigger,
} from '@smartapp/ui/components/file-upload';
import { Label } from '@smartapp/ui/components/label';
import { MaskInput } from '@smartapp/ui/components/mask-input';
import { NumberTicker } from '@smartapp/ui/components/number-ticker';
import { Timeline, TimelineContent, TimelineDate, TimelineHeader, TimelineIndicator, TimelineItem, TimelineSeparator, TimelineTitle } from '@smartapp/ui/components/reui/timeline';
import { SidebarProvider } from '@smartapp/ui/components/sidebar';
import { Sortable, SortableContent, SortableItem, SortableItemHandle } from '@smartapp/ui/components/sortable';
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

function FileUploadDemo() {
  const [files, setFiles] = useState<File[]>([]);
  return (
    <FileUpload value={files} onValueChange={setFiles} accept="image/*" maxFiles={1} className="w-full max-w-sm">
      <FileUploadDropzone className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border p-6 text-center text-sm">
        <IconUpload className="size-6 text-muted-foreground" />
        <span>Drop a product photo</span>
        <FileUploadTrigger render={<Button variant="outline" size="sm" />}>Choose photo</FileUploadTrigger>
      </FileUploadDropzone>
      <FileUploadList>
        {files.map((file) => (
          <FileUploadItem key={file.name} value={file}>
            <FileUploadItemPreview />
            <FileUploadItemMetadata />
            <FileUploadItemDelete render={<Button variant="ghost" size="icon-sm" aria-label="Remove" />}>
              <IconX />
            </FileUploadItemDelete>
          </FileUploadItem>
        ))}
      </FileUploadList>
    </FileUpload>
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
      <Demo name="DiceUI file-upload">{() => <FileUploadDemo />}</Demo>
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
