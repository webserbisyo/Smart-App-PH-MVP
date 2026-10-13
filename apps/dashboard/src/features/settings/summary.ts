import { formatPhPhone, formatTimeOfDay, manilaParts, THEME_PRESET_KEYS, THEME_PRESETS, WORDS } from '@smartapp/core';
import type { BusinessHours, PaymentAccount, ShopSettings, StampRule, ThemePresetKey } from '@smartapp/core';

// The one-line summaries on the Settings list.

const words = WORDS.dashboard.settings;

/** The preset these colours are, or `null` for the owner's own colours. */
export function matchingPreset(colors: { primary: string; secondary: string; accent: string }): ThemePresetKey | null {
  const same = (a: string, b: string) => a.toUpperCase() === b.toUpperCase();
  return (
    THEME_PRESET_KEYS.find((key) => {
      const preset = THEME_PRESETS[key];
      return same(preset.primary, colors.primary) && same(preset.secondary, colors.secondary) && same(preset.accent, colors.accent);
    }) ?? null
  );
}

export function lookSummary(name: string, settings: ShopSettings): string {
  const preset = matchingPreset({ primary: settings.colorPrimary, secondary: settings.colorSecondary, accent: settings.colorAccent });
  return words.summary.look(name, preset ? words.look.presetNames[preset] : words.summary.customColors);
}

export function infoSummary(settings: ShopSettings): string {
  if (settings.phone) return formatPhPhone(settings.phone);
  return settings.address ?? words.summary.infoEmpty;
}

/** Paused wins, then a closed day, then today's hours (Manila). */
export function hoursSummary(settings: ShopSettings, hours: readonly BusinessHours[], closures: readonly { closedOn: string }[], now: Date): string {
  if (!settings.acceptingOrders) return words.summary.paused;
  if (hours.length === 0) return words.summary.noHours;
  const today = manilaParts(now);
  if (closures.some((closure) => closure.closedOn === today.date)) return words.summary.closedToday;
  const day = hours.find((entry) => entry.weekday === today.weekday);
  return day ? words.summary.hoursToday(formatTimeOfDay(day.opensAt), formatTimeOfDay(day.closesAt)) : words.summary.closedToday;
}

export function orderTypesSummary(settings: ShopSettings): string {
  const fulfillment = WORDS.order.fulfillment;
  const on = [settings.walkInEnabled && fulfillment.walk_in, settings.pickupEnabled && fulfillment.pickup, settings.deliveryEnabled && fulfillment.delivery];
  return on.filter((label) => label !== false).join(', ');
}

export function paymentsSummary(accounts: readonly PaymentAccount[]): string {
  const methods = [...new Set(accounts.filter((account) => account.isActive).map((account) => WORDS.order.method[account.method]))];
  return methods.length > 0 ? methods.join(', ') : words.summary.paymentsEmpty;
}

export function stampsSummary(rule: StampRule): string {
  return rule.isActive ? words.summary.stamps(rule.stampsNeeded, rule.rewardLabel) : words.summary.stampsOff;
}
