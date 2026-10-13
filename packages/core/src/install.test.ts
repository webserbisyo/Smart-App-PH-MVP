import { describe, expect, it } from 'vitest';

import { INSTALL_SNOOZE_DAYS, installOffer, installPlatform, parseDismissedAt } from './install';
import type { InstallState } from './install';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const IPAD = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-A155F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36';
const MESSENGER = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/MessengerForiOS;FBAV/480.0]';
const NOW = Date.UTC(2026, 9, 12);
const DAY = 86_400_000;

const base: InstallState = { platform: 'other', standalone: false, dismissedAt: null, now: NOW, canPrompt: true };

describe('installPlatform', () => {
  it('knows iPhones, iPads asking for the desktop site, in-app browsers and the rest', () => {
    expect(installPlatform(IPHONE, 5)).toBe('ios');
    expect(installPlatform(IPAD, 5)).toBe('ios');
    expect(installPlatform(IPAD, 0)).toBe('other');
    expect(installPlatform(MESSENGER, 5)).toBe('in_app');
    expect(installPlatform(ANDROID, 5)).toBe('other');
  });
});

describe('installOffer', () => {
  it('opens the browser install on Android and desktop only when the browser offers it', () => {
    expect(installOffer(base)).toBe('prompt');
    expect(installOffer({ ...base, canPrompt: false })).toBe('none');
  });

  it('shows the drawn steps on iPhone', () => {
    expect(installOffer({ ...base, platform: 'ios', canPrompt: false })).toBe('ios_steps');
  });

  it('hides when already installed and in in-app browsers', () => {
    expect(installOffer({ ...base, standalone: true })).toBe('none');
    expect(installOffer({ ...base, platform: 'ios', standalone: true })).toBe('none');
    expect(installOffer({ ...base, platform: 'in_app' })).toBe('none');
  });

  it(`hides for ${String(INSTALL_SNOOZE_DAYS)} days after Not now, then shows again`, () => {
    expect(installOffer({ ...base, dismissedAt: NOW - DAY })).toBe('none');
    expect(installOffer({ ...base, platform: 'ios', dismissedAt: NOW - 13 * DAY })).toBe('none');
    expect(installOffer({ ...base, dismissedAt: NOW - 14 * DAY })).toBe('prompt');
    expect(installOffer({ ...base, platform: 'ios', dismissedAt: NOW - 30 * DAY })).toBe('ios_steps');
  });

  it('ignores a "Not now" time in the future (a changed phone clock)', () => {
    expect(installOffer({ ...base, dismissedAt: NOW + DAY })).toBe('prompt');
  });
});

describe('parseDismissedAt', () => {
  it('reads a stored time and ignores anything else', () => {
    expect(parseDismissedAt(String(NOW))).toBe(NOW);
    expect(parseDismissedAt(null)).toBeNull();
    expect(parseDismissedAt('soon')).toBeNull();
    expect(parseDismissedAt('-5')).toBeNull();
  });
});
