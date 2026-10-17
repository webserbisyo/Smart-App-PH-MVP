import type { Pin } from './schemas/pin';

/**
 * Calculates the great-circle distance between two pins using the Haversine formula,
 * rounded to 0.1 km.
 */
export function distanceKm(a: Pin, b: Pin): number {
  const R = 6371; // Earth's mean radius in km
  const toRad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toRad;
  const dLng = (b.lng - a.lng) * toRad;
  const lat1 = a.lat * toRad;
  const lat2 = b.lat * toRad;

  const sinDlat2 = Math.sin(dLat / 2);
  const sinDlng2 = Math.sin(dLng / 2);

  const h = sinDlat2 * sinDlat2 + Math.cos(lat1) * Math.cos(lat2) * sinDlng2 * sinDlng2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  const d = R * c;

  return Math.round(d * 10) / 10;
}

/**
 * Returns a standard Google Maps link for a pin.
 */
export function mapsLink(pin: Pin): string {
  return `https://www.google.com/maps?q=${String(pin.lat)},${String(pin.lng)}`;
}

/**
 * Parses latitude and longitude from various Google Maps URL formats.
 * Supports:
 * - /@<lat>,<lng>,...
 * - query params: q=<lat>,<lng>, query=<lat>,<lng>, ll=<lat>,<lng>
 * - data params: !3d<lat>!4d<lng>
 * Returns null for short links (e.g. maps.app.goo.gl, goo.gl/maps) or unparseable URLs.
 */
export function pinFromMapsLink(url: string): Pin | null {
  if (!url || typeof url !== 'string') return null;

  // Short links hide coordinates behind a redirect
  if (url.includes('maps.app.goo.gl') || url.includes('goo.gl/maps')) {
    return null;
  }

  const validPin = (latStr: string, lngStr: string): Pin | null => {
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    if (isNaN(lat) || isNaN(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat, lng };
  };

  // 1. Check data format: !3d<lat>!4d<lng>
  const dataMatch = url.match(/!3d(-?\d+(?:\.\d+)?).*?!4d(-?\d+(?:\.\d+)?)/);
  if (dataMatch && dataMatch[1] && dataMatch[2]) {
    const pin = validPin(dataMatch[1], dataMatch[2]);
    if (pin) return pin;
  }

  // 2. Check path coordinates: /@<lat>,<lng>
  const pathMatch = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (pathMatch && pathMatch[1] && pathMatch[2]) {
    const pin = validPin(pathMatch[1], pathMatch[2]);
    if (pin) return pin;
  }

  // 3. Check query parameters: q=, query=, ll=
  const qMatch = url.match(/[?&](?:q|query|ll)=(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)(?:[&/?#]|$)/);
  if (qMatch && qMatch[1] && qMatch[2]) {
    const pin = validPin(qMatch[1], qMatch[2]);
    if (pin) return pin;
  }

  return null;
}

/**
 * Checks whether the tracking URL's hostname is valid for the given delivery provider.
 * Provider allowlist:
 * - 'lalamove': *.lalamove.com or lalamove.com
 * - 'grab': *.grab.com or grab.com
 * - 'own' | 'other': any valid https URL
 */
export function trackingHostOk(provider: string, url: string): boolean {
  if (!url || typeof url !== 'string' || url.includes('@') || !/^https:\/\/[^\s/]+\.[^\s]+$/.test(url)) return false;

  const match = url.match(/^https:\/\/([^/:?#@]+)/i);
  if (!match || !match[1]) return false;

  const host = match[1].toLowerCase();

  switch (provider) {
    case 'lalamove':
      return host === 'lalamove.com' || host.endsWith('.lalamove.com');
    case 'grab':
      return host === 'grab.com' || host.endsWith('.grab.com');
    case 'own':
    case 'other':
      return true;
    default:
      return false;
  }
}
