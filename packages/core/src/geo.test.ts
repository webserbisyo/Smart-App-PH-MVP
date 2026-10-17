import { describe, expect, it } from 'vitest';

import { distanceKm, findNearestZone, mapsLink, pinFromMapsLink, trackingHostOk } from './geo';
import { Pin } from './schemas/pin';

describe('Pin schema', () => {
  it('validates correct latitude and longitude', () => {
    expect(Pin.parse({ lat: 14.5995, lng: 120.9842 })).toEqual({ lat: 14.5995, lng: 120.9842 });
    expect(Pin.parse({ lat: -90, lng: -180 })).toEqual({ lat: -90, lng: -180 });
    expect(Pin.parse({ lat: 90, lng: 180 })).toEqual({ lat: 90, lng: 180 });
  });

  it('rejects invalid coordinates', () => {
    expect(() => Pin.parse({ lat: 95, lng: 120 })).toThrow();
    expect(() => Pin.parse({ lat: 14, lng: 185 })).toThrow();
    expect(() => Pin.parse({ lat: 14 })).toThrow();
    expect(() => Pin.parse({ lng: 120 })).toThrow();
  });
});

describe('distanceKm', () => {
  it('computes distance between Manila City Hall and Quezon City Hall to be about 11 km', () => {
    const manila: Pin = { lat: 14.5896, lng: 120.9815 };
    const quezonCity: Pin = { lat: 14.6488, lng: 121.0509 };

    const dist = distanceKm(manila, quezonCity);
    // Great circle distance is ~9.9 - 11.0 km
    expect(dist).toBeGreaterThanOrEqual(10.0);
    expect(dist).toBeLessThanOrEqual(12.0);
    expect(dist).toBe(10.0); // round to 0.1 km
  });

  it('returns 0 for identical points', () => {
    const point: Pin = { lat: 14.5995, lng: 120.9842 };
    expect(distanceKm(point, point)).toBe(0);
  });
});

describe('mapsLink', () => {
  it('generates standard Google Maps query link', () => {
    const pin: Pin = { lat: 14.5995, lng: 120.9842 };
    expect(mapsLink(pin)).toBe('https://www.google.com/maps?q=14.5995,120.9842');
  });
});

describe('pinFromMapsLink', () => {
  it('parses /@lat,lng format', () => {
    const url = 'https://www.google.com/maps/@14.599512,120.984222,17z?entry=ttu';
    expect(pinFromMapsLink(url)).toEqual({ lat: 14.599512, lng: 120.984222 });
  });

  it('parses ?q=lat,lng format', () => {
    const url = 'https://www.google.com/maps?q=14.599512,120.984222';
    expect(pinFromMapsLink(url)).toEqual({ lat: 14.599512, lng: 120.984222 });
  });

  it('parses ?query=lat,lng format', () => {
    const url = 'https://maps.google.com/?query=14.5995,120.9842';
    expect(pinFromMapsLink(url)).toEqual({ lat: 14.5995, lng: 120.9842 });
  });

  it('parses !3d... !4d... data format', () => {
    const url = 'https://www.google.com/maps/place/Rizal+Park/@14.583145,120.979421,17z/data=!3d14.5826!4d120.9787!16s';
    expect(pinFromMapsLink(url)).toEqual({ lat: 14.5826, lng: 120.9787 });
  });

  it('returns null for short maps.app.goo.gl and goo.gl links', () => {
    expect(pinFromMapsLink('https://maps.app.goo.gl/abc123xyz')).toBeNull();
    expect(pinFromMapsLink('https://goo.gl/maps/abc123xyz')).toBeNull();
  });

  it('returns null for text search without coordinates', () => {
    expect(pinFromMapsLink('https://www.google.com/maps?q=Manila+Cathedral')).toBeNull();
  });
});

describe('trackingHostOk', () => {
  it('validates lalamove hosts', () => {
    expect(trackingHostOk('lalamove', 'https://m.lalamove.com/order/123')).toBe(true);
    expect(trackingHostOk('lalamove', 'https://lalamove.com/track')).toBe(true);
    expect(trackingHostOk('lalamove', 'https://tracking.lalamove.com/xyz')).toBe(true);
    expect(trackingHostOk('lalamove', 'https://evil-lalamove.com/track')).toBe(false);
    expect(trackingHostOk('lalamove', 'https://google.com')).toBe(false);
  });

  it('validates grab hosts', () => {
    expect(trackingHostOk('grab', 'https://delivery.grab.com/order/123')).toBe(true);
    expect(trackingHostOk('grab', 'https://grab.com/track')).toBe(true);
    expect(trackingHostOk('grab', 'https://grabby.com/track')).toBe(false);
  });

  it('allows any https URL for own and other', () => {
    expect(trackingHostOk('own', 'https://my-store.ph/delivery/123')).toBe(true);
    expect(trackingHostOk('other', 'https://custom-courier.com/shipment/456')).toBe(true);
    expect(trackingHostOk('own', 'http://insecure.com/track')).toBe(false);
  });

  it('rejects bypasses with query, hash, spaces or credentials', () => {
    expect(trackingHostOk('lalamove', 'https://evil.example?x.lalamove.com')).toBe(false);
    expect(trackingHostOk('grab', 'https://evil.example#.grab.com')).toBe(false);
    expect(trackingHostOk('own', 'https://a b c')).toBe(false);
    expect(trackingHostOk('other', 'https://a b c')).toBe(false);
    expect(trackingHostOk('lalamove', 'https://user@lalamove.com')).toBe(false);
  });
});

describe('findNearestZone', () => {
  const zones = [
    { id: 'z1', name: 'Zone 1 (Poblacion)', centerLat: 14.5995, centerLng: 120.9842, isActive: true },
    { id: 'z2', name: 'Zone 2 (Quezon City)', centerLat: 14.6488, centerLng: 121.0509, isActive: true },
    { id: 'z3', name: 'Zone 3 (Inactive)', centerLat: 14.5996, centerLng: 120.9843, isActive: false },
    { id: 'z4', name: 'Zone 4 (No center)', isActive: true },
  ];

  it('finds the nearest active zone with coordinates', () => {
    const nearManila: Pin = { lat: 14.6000, lng: 120.9850 };
    const nearest = findNearestZone(zones, nearManila);
    expect(nearest).not.toBeNull();
    expect(nearest?.zone.id).toBe('z1');
  });

  it('ignores inactive zones and zones without coordinates', () => {
    const nearInactive: Pin = { lat: 14.5996, lng: 120.9843 };
    const nearest = findNearestZone(zones, nearInactive);
    expect(nearest?.zone.id).toBe('z1');
  });

  it('returns null if no zones have coordinates', () => {
    const result = findNearestZone([{ id: 'z4', name: 'Zone 4', isActive: true }], { lat: 14.6, lng: 121.0 });
    expect(result).toBeNull();
  });
});

