'use client';

import { useState } from 'react';

import {
  THEME_PRESET_KEYS,
  THEME_PRESETS,
  themeContrastIssues,
  WORDS,
} from '@smartapp/core';
import type { ThemePresetKey } from '@smartapp/core';
import { Alert, AlertDescription, AlertTitle } from '#components/alert';
import { Button } from '#components/button';
import {
  ColorPicker,
  ColorPickerArea,
  ColorPickerContent,
  ColorPickerHueSlider,
  ColorPickerInput,
  ColorPickerSwatch,
  ColorPickerTrigger,
} from '#components/color-picker';
import { FieldDescription, FieldLegend, FieldSet } from '#components/field';
import { toast } from '#components/sonner';
import { IconAlertTriangle, IconChevronDown, IconChevronUp, IconPalette, IconSparkles } from '../icons';
import { dominantColor } from '#lib/color-extract';
import { cn } from '#lib/utils';

export interface BrandColorFieldProps {
  primary: string;
  secondary: string;
  accent: string;
  logoUrl?: string | null | undefined;
  onChangeOne: (brandHex: string) => void;
  onChangePart: (part: 'primary' | 'secondary' | 'accent', hex: string) => void;
  disabled?: boolean | undefined;
}

const words = WORDS.dashboard.settings.look;

function ColorFieldItem({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <ColorPicker
        value={value}
        open={open}
        onOpenChange={setOpen}
        onValueChange={(next) => {
          if (open && /^#[0-9a-fA-F]{6}$/.test(next) && next.toUpperCase() !== value) {
            onChange(next.toUpperCase());
          }
        }}
      >
        <ColorPickerTrigger
          disabled={disabled}
          render={
            <Button variant="outline" size="sm" className="justify-start gap-2 text-xs" aria-label={words.pick(label)} />
          }
        >
          <ColorPickerSwatch className="size-4 rounded-xs" />
          <span className="tabular">{value}</span>
        </ColorPickerTrigger>
        <ColorPickerContent>
          <ColorPickerArea />
          <ColorPickerHueSlider />
          <ColorPickerInput />
        </ColorPickerContent>
      </ColorPicker>
    </div>
  );
}

/**
 * BrandColorField pattern (Storefront v2 Step 10):
 * - One brand colour picker that automatically builds 60/30/10 OKLCH shop palette
 * - 4 Presets (Uling, Kape, Ube, Dagat)
 * - "Use logo colour" extracting dominant colour from logo using canvas
 * - Live 60/30/10 preview swatches
 * - "Advanced" accordion for 3 separate colours with contrast check
 */
export function BrandColorField({
  primary,
  secondary,
  accent,
  logoUrl,
  onChangeOne,
  onChangePart,
  disabled = false,
}: BrandColorFieldProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [brandPickerOpen, setBrandPickerOpen] = useState(false);

  const issues = themeContrastIssues({ primary, secondary, accent });

  const handleUseLogoColor = async () => {
    if (!logoUrl) {
      toast.info(words.noLogoColor);
      return;
    }
    setExtracting(true);
    try {
      const extracted = await dominantColor(logoUrl);
      onChangeOne(extracted);
      toast.success(`Applied logo colour (${extracted})`);
    } catch {
      toast.error('Could not extract color from logo');
    } finally {
      setExtracting(false);
    }
  };

  return (
    <FieldSet className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <FieldLegend className="text-base font-semibold">{words.colors}</FieldLegend>
        <FieldDescription>{words.brandColorHint}</FieldDescription>
      </div>

      {/* Main Single Brand Color Picker + Use Logo Colour */}
      <div className="flex flex-wrap items-center gap-3">
        <ColorPicker
          value={accent}
          open={brandPickerOpen}
          onOpenChange={setBrandPickerOpen}
          onValueChange={(next) => {
            if (brandPickerOpen && /^#[0-9a-fA-F]{6}$/.test(next)) {
              onChangeOne(next.toUpperCase());
            }
          }}
        >
          <ColorPickerTrigger
            disabled={disabled}
            render={
              <Button
                variant="outline"
                className="h-11 justify-start gap-3 px-3 text-sm font-semibold"
                aria-label="Pick brand colour"
              />
            }
          >
            <ColorPickerSwatch className="size-6 rounded-md shadow-xs" />
            <div className="flex flex-col items-start text-left">
              <span className="text-[11px] font-normal text-muted-foreground">{words.brandColor}</span>
              <span className="tabular leading-tight">{accent}</span>
            </div>
          </ColorPickerTrigger>
          <ColorPickerContent>
            <ColorPickerArea />
            <ColorPickerHueSlider />
            <ColorPickerInput />
          </ColorPickerContent>
        </ColorPicker>

        {/* Use Logo Colour button */}
        <Button
          type="button"
          variant="outline"
          className="h-11 gap-2 text-sm"
          disabled={disabled || extracting || !logoUrl}
          onClick={() => {
            void handleUseLogoColor();
          }}
        >
          <IconSparkles className="size-4 text-primary" />
          {extracting ? 'Extracting...' : words.useLogoColor}
        </Button>
      </div>

      {/* Presets Grid */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{words.presets}</span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {THEME_PRESET_KEYS.map((key: ThemePresetKey) => {
            const preset = THEME_PRESETS[key];
            const isSelected =
              preset.primary === primary && preset.secondary === secondary && preset.accent === accent;

            return (
              <Button
                key={key}
                type="button"
                variant="outline"
                aria-pressed={isSelected}
                disabled={disabled}
                className={cn(
                  'h-auto justify-start gap-2.5 py-2.5 px-3',
                  isSelected && 'border-primary ring-2 ring-primary/30 font-semibold',
                )}
                onClick={() => {
                  onChangeOne(preset.accent);
                }}
              >
                <span aria-hidden="true" className="flex shrink-0 overflow-hidden rounded-md border shadow-xs">
                  <span className="size-4.5" style={{ background: preset.primary }} />
                  <span className="size-4.5" style={{ background: preset.secondary }} />
                  <span className="size-4.5" style={{ background: preset.accent }} />
                </span>
                <span className="text-xs">{words.presetNames[key]}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Live 60/30/10 Palette Swatches */}
      <div className="flex flex-col gap-1.5 rounded-[var(--radius-card,1.25rem)] border border-border/60 bg-muted/20 p-3.5 shadow-xs">
        <span className="text-xs font-semibold text-foreground">{words.palettePreview}</span>
        <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
          <div className="flex flex-col items-center gap-1">
            <div className="size-9 rounded-lg border shadow-xs" style={{ backgroundColor: primary }} />
            <span className="text-[11px] font-medium text-foreground">60% Page</span>
            <span className="text-[10px] text-muted-foreground tabular">{primary}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="size-9 rounded-lg border shadow-xs" style={{ backgroundColor: secondary }} />
            <span className="text-[11px] font-medium text-foreground">30% Cards</span>
            <span className="text-[10px] text-muted-foreground tabular">{secondary}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="size-9 rounded-lg border shadow-xs" style={{ backgroundColor: accent }} />
            <span className="text-[11px] font-medium text-foreground">10% Buttons</span>
            <span className="text-[10px] text-muted-foreground tabular">{accent}</span>
          </div>
        </div>
      </div>

      {/* Advanced Toggle */}
      <div className="flex flex-col gap-3 pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start gap-1.5 text-xs text-muted-foreground"
          onClick={() => {
            setAdvancedOpen((prev) => !prev);
          }}
        >
          <IconPalette className="size-3.5" />
          <span>{advancedOpen ? words.advancedClose : words.advanced}</span>
          {advancedOpen ? <IconChevronUp className="size-3.5" /> : <IconChevronDown className="size-3.5" />}
        </Button>

        {advancedOpen && (
          <div className="flex flex-col gap-3 rounded-[var(--radius-card,1.25rem)] border border-border/60 bg-background p-4 shadow-xs">
            <div className="grid gap-3 sm:grid-cols-3">
              <ColorFieldItem
                label={words.background}
                value={primary}
                onChange={(hex) => {
                  onChangePart('primary', hex);
                }}
                disabled={disabled}
              />
              <ColorFieldItem
                label={words.cards}
                value={secondary}
                onChange={(hex) => {
                  onChangePart('secondary', hex);
                }}
                disabled={disabled}
              />
              <ColorFieldItem
                label={words.buttons}
                value={accent}
                onChange={(hex) => {
                  onChangePart('accent', hex);
                }}
                disabled={disabled}
              />
            </div>

            {issues.length > 0 && (
              <Alert role="status" className="border-warning bg-warning-soft text-warning-soft-foreground">
                <IconAlertTriangle aria-hidden="true" />
                <AlertTitle>{words.contrast.title}</AlertTitle>
                <AlertDescription className="text-warning-soft-foreground text-xs">
                  <ul className="list-disc pl-4">
                    {issues.map((issue) => (
                      <li key={issue}>{words.contrast[issue]}</li>
                    ))}
                  </ul>
                  <p className="mt-1">{words.contrast.fix}</p>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </div>
    </FieldSet>
  );
}
