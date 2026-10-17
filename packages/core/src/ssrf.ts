/**
 * Server-Side Request Forgery (SSRF) protection utilities.
 * Checks IP addresses to prevent access to private, loopback, link-local,
 * cloud metadata, multicast, and reserved networks.
 *
 * Requirements:
 * - Refuse IPv6 and IPv4-mapped private addresses.
 * - Refuse private / loopback / link-local / broadcast / reserved IPv4 addresses.
 */

function parseIpv4Octets(ip: string): [number, number, number, number] | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;

  const octets: number[] = [];
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null;
    // Reject leading zeroes to prevent octal ambiguity (e.g. 0177)
    if (part.length > 1 && part.startsWith('0')) return null;
    const num = Number(part);
    if (!Number.isInteger(num) || num < 0 || num > 255) return null;
    octets.push(num);
  }

  const o0 = octets[0];
  const o1 = octets[1];
  const o2 = octets[2];
  const o3 = octets[3];
  if (o0 === undefined || o1 === undefined || o2 === undefined || o3 === undefined) {
    return null;
  }

  return [o0, o1, o2, o3];
}

function isPrivateIpv4Octets(o1: number, o2: number, o3: number): boolean {
  // 0.0.0.0/8 (Current network / "this" network)
  if (o1 === 0) return true;

  // 10.0.0.0/8 (Private-Use Networks, RFC 1918)
  if (o1 === 10) return true;

  // 100.64.0.0/10 (Shared Address Space / CGNAT, RFC 6598)
  if (o1 === 100 && o2 >= 64 && o2 <= 127) return true;

  // 127.0.0.0/8 (Loopback, RFC 1122)
  if (o1 === 127) return true;

  // 169.254.0.0/16 (Link-Local / Cloud Instance Metadata, RFC 3927)
  if (o1 === 169 && o2 === 254) return true;

  // 172.16.0.0/12 (Private-Use Networks 172.16.0.0 - 172.31.255.255, RFC 1918)
  if (o1 === 172 && o2 >= 16 && o2 <= 31) return true;

  // 192.0.0.0/24 (IETF Protocol Assignments)
  if (o1 === 192 && o2 === 0 && o3 === 0) return true;

  // 192.0.2.0/24 (TEST-NET-1, documentation)
  if (o1 === 192 && o2 === 0 && o3 === 2) return true;

  // 192.88.99.0/24 (6to4 Relay Anycast)
  if (o1 === 192 && o2 === 88 && o3 === 99) return true;

  // 192.168.0.0/16 (Private-Use Networks, RFC 1918)
  if (o1 === 192 && o2 === 168) return true;

  // 198.18.0.0/15 (Benchmarking)
  if (o1 === 198 && (o2 === 18 || o2 === 19)) return true;

  // 198.51.100.0/24 (TEST-NET-2, documentation)
  if (o1 === 198 && o2 === 51 && o3 === 100) return true;

  // 203.0.113.0/24 (TEST-NET-3, documentation)
  if (o1 === 203 && o2 === 0 && o3 === 113) return true;

  // 224.0.0.0/4 (Multicast, RFC 5771)
  if (o1 >= 224 && o1 <= 239) return true;

  // 240.0.0.0/4 (Reserved / Future Use / Broadcast 255.255.255.255, RFC 1112)
  if (o1 >= 240) return true;

  return false;
}

/**
 * Checks whether an IP address is blocked for SSRF protection.
 * Returns true if the IP is blocked (private, loopback, link-local, multicast,
 * cloud metadata, pure IPv6, or IPv4-mapped private address).
 * Returns false only if the IP is a valid public IPv4 address.
 */
export function isBlockedIp(rawIp: string): boolean {
  if (!rawIp || typeof rawIp !== 'string') return true;

  // Strip IPv6 zone index if present (e.g. fe80::1%eth0)
  const first = rawIp.split('%')[0];
  const ip = (first ?? '').trim().toLowerCase();
  if (ip.length === 0) return true;

  // Check for IPv4-mapped IPv6 in dotted decimal: ::ffff:192.168.1.1 or 0:0:0:0:0:ffff:192.168.1.1
  const mappedDottedMatch = /^(?:0*:)*ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(ip);
  if (mappedDottedMatch && mappedDottedMatch[1]) {
    const octets = parseIpv4Octets(mappedDottedMatch[1]);
    if (!octets) return true;
    return isPrivateIpv4Octets(octets[0], octets[1], octets[2]);
  }

  // Check for IPv4-mapped IPv6 in hexadecimal: ::ffff:7f00:1 or ::ffff:7f00:0001
  const mappedHexMatch = /^(?:0*:)*ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(ip);
  if (mappedHexMatch && mappedHexMatch[1] && mappedHexMatch[2]) {
    const hi = parseInt(mappedHexMatch[1], 16);
    const lo = parseInt(mappedHexMatch[2], 16);
    const o1 = (hi >> 8) & 0xff;
    const o2 = hi & 0xff;
    const o3 = (lo >> 8) & 0xff;
    return isPrivateIpv4Octets(o1, o2, o3);
  }

  // Refuse all other IPv6 addresses (pure IPv6, link-local, loopback, unique local, etc.)
  if (ip.includes(':')) {
    return true;
  }

  // Parse standard IPv4
  const octets = parseIpv4Octets(ip);
  if (!octets) {
    // Not a valid standard 4-octet IPv4 address
    return true;
  }

  return isPrivateIpv4Octets(octets[0], octets[1], octets[2]);
}
