import dns from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';

import { isBlockedIp } from '@smartapp/core';

export interface FetchedImage {
  buffer: Buffer;
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
  ext: 'jpg' | 'png' | 'webp';
}

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_REDIRECTS = 2;
const TIMEOUT_MS = 10_000;

function detectImageFormat(
  buf: Buffer,
): { contentType: 'image/jpeg' | 'image/png' | 'image/webp'; ext: 'jpg' | 'png' | 'webp' } | null {
  if (buf.length < 12) return null;

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { contentType: 'image/jpeg', ext: 'jpg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return { contentType: 'image/png', ext: 'png' };
  }

  // WebP: 'RIFF' .... 'WEBP'
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return { contentType: 'image/webp', ext: 'webp' };
  }

  return null;
}

type SingleRequestResult =
  | { type: 'redirect'; location: string }
  | { type: 'data'; buffer: Buffer };

function makeSingleRequest(url: URL, checkedIp: string): Promise<SingleRequestResult> {
  return new Promise((resolve, reject) => {
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    const defaultPort = isHttps ? 443 : 80;
    const port = url.port ? parseInt(url.port, 10) : defaultPort;

    const options: https.RequestOptions = {
      host: checkedIp,
      port,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        Host: url.hostname,
        Accept: 'image/jpeg,image/png,image/webp,*/*',
        'User-Agent': 'SmartApp-MediaFetcher/1.0',
      },
      timeout: TIMEOUT_MS,
      ...(isHttps ? { servername: url.hostname } : {}),
    };

    const req = client.request(options, (res) => {
      const statusCode = res.statusCode ?? 0;

      // Handle redirect
      if (statusCode >= 300 && statusCode < 400 && res.headers.location) {
        res.resume(); // discard body
        resolve({ type: 'redirect', location: res.headers.location });
        return;
      }

      if (statusCode < 200 || statusCode >= 300) {
        res.resume();
        reject(new Error(`Server returned HTTP ${String(statusCode)}`));
        return;
      }

      // Check Content-Length if provided upfront
      const contentLengthHeader = res.headers['content-length'];
      if (contentLengthHeader) {
        const length = parseInt(contentLengthHeader, 10);
        if (!isNaN(length) && length > MAX_BYTES) {
          req.destroy();
          reject(new Error('Image exceeds 2 MB limit'));
          return;
        }
      }

      const chunks: Buffer[] = [];
      let totalBytes = 0;

      res.on('data', (chunk: Buffer) => {
        totalBytes += chunk.length;
        if (totalBytes > MAX_BYTES) {
          req.destroy();
          reject(new Error('Image exceeds 2 MB limit'));
          return;
        }
        chunks.push(chunk);
      });

      res.on('end', () => {
        resolve({ type: 'data', buffer: Buffer.concat(chunks) });
      });

      res.on('error', (err) => {
        reject(err);
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

/**
 * Downloads an image with strict SSRF protection:
 * - DNS lookup verifies all resolved IPs against blocked/private ranges.
 * - Connects directly to the checked IP to prevent DNS rebinding attacks.
 * - Re-evaluates every redirect hop with DNS + IP validation (max 2 redirects).
 * - Streams and aborts immediately if size exceeds 2 MB.
 * - Validates magic bytes for JPEG, PNG, or WebP.
 */
export async function fetchImageSafely(initialUrl: string): Promise<FetchedImage> {
  let currentUrl = initialUrl;
  let redirects = 0;

  while (redirects <= MAX_REDIRECTS) {
    let parsed: URL;
    try {
      parsed = new URL(currentUrl);
    } catch {
      throw new Error('Invalid URL format');
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Only HTTP and HTTPS URLs are allowed');
    }

    const hostname = parsed.hostname;

    // Step 1: DNS check
    let addresses: { address: string; family: number }[];
    try {
      addresses = await dns.lookup(hostname, { all: true });
    } catch (err: unknown) {
      throw new Error(
        `DNS lookup failed for ${hostname}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    if (addresses.length === 0) {
      throw new Error(`No IP addresses found for host ${hostname}`);
    }

    // Check all resolved addresses - if ANY address is blocked, refuse
    for (const addr of addresses) {
      if (isBlockedIp(addr.address)) {
        throw new Error(`Access to private or blocked address ${addr.address} is forbidden`);
      }
    }

    // Pick first validated IP
    const first = addresses[0];
    if (!first) {
      throw new Error(`No IP addresses found for host ${hostname}`);
    }
    const targetIp = first.address;

    // Step 2: Connect directly to the checked IP
    const result = await makeSingleRequest(parsed, targetIp);

    if (result.type === 'redirect') {
      redirects += 1;
      if (redirects > MAX_REDIRECTS) {
        throw new Error('Too many redirects (max 2 allowed)');
      }
      currentUrl = new URL(result.location, currentUrl).toString();
      continue;
    }

    // Step 3: Magic bytes check
    const format = detectImageFormat(result.buffer);
    if (!format) {
      throw new Error('The downloaded file is not a supported image (JPEG, PNG, or WebP)');
    }

    return {
      buffer: result.buffer,
      contentType: format.contentType,
      ext: format.ext,
    };
  }

  throw new Error('Too many redirects');
}
