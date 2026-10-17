import { describe, expect, it } from 'vitest';

import { isBlockedIp } from './ssrf';

describe('SSRF Protection - isBlockedIp', () => {
  describe('IPv4 Private & Loopback Addresses (must be blocked)', () => {
    it('blocks loopback (127.0.0.0/8)', () => {
      expect(isBlockedIp('127.0.0.1')).toBe(true);
      expect(isBlockedIp('127.0.0.2')).toBe(true);
      expect(isBlockedIp('127.255.255.255')).toBe(true);
    });

    it('blocks 10.0.0.0/8 private network', () => {
      expect(isBlockedIp('10.0.0.1')).toBe(true);
      expect(isBlockedIp('10.255.255.255')).toBe(true);
      expect(isBlockedIp('10.128.0.1')).toBe(true);
    });

    it('blocks 172.16.0.0/12 private network', () => {
      expect(isBlockedIp('172.16.0.1')).toBe(true);
      expect(isBlockedIp('172.20.10.5')).toBe(true);
      expect(isBlockedIp('172.31.255.255')).toBe(true);
      // 172.15.* and 172.32.* are public
      expect(isBlockedIp('172.15.255.255')).toBe(false);
      expect(isBlockedIp('172.32.0.1')).toBe(false);
    });

    it('blocks 192.168.0.0/16 private network', () => {
      expect(isBlockedIp('192.168.0.1')).toBe(true);
      expect(isBlockedIp('192.168.1.1')).toBe(true);
      expect(isBlockedIp('192.168.254.254')).toBe(true);
    });

    it('blocks cloud metadata / link-local (169.254.0.0/16)', () => {
      expect(isBlockedIp('169.254.169.254')).toBe(true);
      expect(isBlockedIp('169.254.0.1')).toBe(true);
    });

    it('blocks current network (0.0.0.0/8) and broadcast (255.255.255.255)', () => {
      expect(isBlockedIp('0.0.0.0')).toBe(true);
      expect(isBlockedIp('0.0.0.1')).toBe(true);
      expect(isBlockedIp('255.255.255.255')).toBe(true);
    });

    it('blocks CGNAT (100.64.0.0/10)', () => {
      expect(isBlockedIp('100.64.0.1')).toBe(true);
      expect(isBlockedIp('100.127.255.255')).toBe(true);
      expect(isBlockedIp('100.63.255.255')).toBe(false);
      expect(isBlockedIp('100.128.0.1')).toBe(false);
    });

    it('blocks multicast (224.0.0.0/4) and reserved (240.0.0.0/4)', () => {
      expect(isBlockedIp('224.0.0.1')).toBe(true);
      expect(isBlockedIp('239.255.255.250')).toBe(true);
      expect(isBlockedIp('240.0.0.1')).toBe(true);
    });

    it('blocks documentation test networks (RFC 5737)', () => {
      expect(isBlockedIp('192.0.2.1')).toBe(true);
      expect(isBlockedIp('198.51.100.1')).toBe(true);
      expect(isBlockedIp('203.0.113.1')).toBe(true);
    });
  });

  describe('IPv6 and IPv4-mapped Addresses (must be refused)', () => {
    it('refuses pure IPv6 loopback (::1)', () => {
      expect(isBlockedIp('::1')).toBe(true);
    });

    it('refuses IPv6 link-local and unique local', () => {
      expect(isBlockedIp('fe80::1')).toBe(true);
      expect(isBlockedIp('fc00::1')).toBe(true);
      expect(isBlockedIp('fd12:3456:789a::1')).toBe(true);
    });

    it('refuses pure public IPv6 addresses (refuse all IPv6 rule)', () => {
      expect(isBlockedIp('2001:4860:4860::8888')).toBe(true);
      expect(isBlockedIp('2606:4700:4700::1111')).toBe(true);
    });

    it('refuses IPv4-mapped private IPv6 addresses in dotted-decimal format', () => {
      expect(isBlockedIp('::ffff:127.0.0.1')).toBe(true);
      expect(isBlockedIp('::ffff:10.0.0.1')).toBe(true);
      expect(isBlockedIp('::ffff:169.254.169.254')).toBe(true);
      expect(isBlockedIp('::ffff:192.168.1.100')).toBe(true);
      expect(isBlockedIp('::ffff:172.20.0.1')).toBe(true);
      expect(isBlockedIp('0:0:0:0:0:ffff:127.0.0.1')).toBe(true);
    });

    it('refuses IPv4-mapped private IPv6 addresses in hex format', () => {
      // 127.0.0.1 in hex is 7f00:0001
      expect(isBlockedIp('::ffff:7f00:1')).toBe(true);
      expect(isBlockedIp('::ffff:7f00:0001')).toBe(true);
      // 10.0.0.1 in hex is 0a00:0001
      expect(isBlockedIp('::ffff:a00:1')).toBe(true);
      // 192.168.1.1 in hex is c0a8:0101
      expect(isBlockedIp('::ffff:c0a8:0101')).toBe(true);
      // 169.254.169.254 in hex is a9fe:a9fe
      expect(isBlockedIp('::ffff:a9fe:a9fe')).toBe(true);
    });
  });

  describe('Invalid or Malformed IP Formats (must be blocked)', () => {
    it('blocks empty, null, or garbage input', () => {
      expect(isBlockedIp('')).toBe(true);
      expect(isBlockedIp('   ')).toBe(true);
      expect(isBlockedIp('not-an-ip')).toBe(true);
      expect(isBlockedIp('http://127.0.0.1')).toBe(true);
    });

    it('blocks octal-encoded or leading zero IPv4 tricks', () => {
      expect(isBlockedIp('0177.0.0.1')).toBe(true);
      expect(isBlockedIp('127.0.0.01')).toBe(true);
    });

    it('blocks incomplete or out-of-range IPv4', () => {
      expect(isBlockedIp('127.0.0')).toBe(true);
      expect(isBlockedIp('127.0.0.1.5')).toBe(true);
      expect(isBlockedIp('999.999.999.999')).toBe(true);
    });
  });

  describe('Public IPv4 Addresses (must be allowed)', () => {
    it('allows valid public IPv4 addresses', () => {
      expect(isBlockedIp('8.8.8.8')).toBe(false);
      expect(isBlockedIp('8.8.4.4')).toBe(false);
      expect(isBlockedIp('1.1.1.1')).toBe(false);
      expect(isBlockedIp('93.184.216.34')).toBe(false);
      expect(isBlockedIp('142.250.190.46')).toBe(false);
      expect(isBlockedIp('151.101.65.140')).toBe(false);
    });
  });
});
