import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { uploadImportedMedia } from '@smartapp/api';

import { fetchImageSafely } from './fetcher';

const ImportBody = z.object({
  url: z.string().trim().startsWith('http'),
  tenantId: z.string().trim().min(1),
});

function isAllowedDashboardOrigin(origin: string | null): boolean {
  if (!origin) return false;
  try {
    const parsed = new URL(origin);
    const host = parsed.hostname;
    const port = parsed.port;

    // Allow local dashboard dev server (Vite default 5173 / preview 4173)
    if ((host === 'localhost' || host === '127.0.0.1') && (port === '5173' || port === '4173')) {
      return true;
    }

    const configured = process.env.DASHBOARD_ORIGIN ?? process.env.NEXT_PUBLIC_DASHBOARD_URL;
    if (configured) {
      const configuredUrl = new URL(configured);
      if (parsed.origin === configuredUrl.origin) {
        return true;
      }
    }
  } catch {
    return false;
  }
  return false;
}

function corsHeaders(origin: string | null): Record<string, string> {
  if (origin && isAllowedDashboardOrigin(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    };
  }
  return {};
}

export function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  if (origin && !isAllowedDashboardOrigin(origin)) {
    return new NextResponse(null, { status: 403 });
  }
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  if (origin && !isAllowedDashboardOrigin(origin)) {
    return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 });
  }

  const headers = corsHeaders(origin);

  // Verify auth header
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized: missing authorization header' }, { status: 401, headers });
  }
  const token = authHeader.slice(7).trim();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers });
  }

  const parsed = ImportBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid or missing image URL/tenantId' }, { status: 400, headers });
  }

  const { url, tenantId } = parsed.data;

  try {
    // 1. Fetch image safely (SSRF protection, DNS rebinding prevention, redirect checking, stream limit 2 MB, magic bytes check)
    const fetched = await fetchImageSafely(url);

    // 2. Upload to Supabase Storage via packages/api
    const env = {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
    };

    const { path } = await uploadImportedMedia(env, token, tenantId, {
      buffer: fetched.buffer,
      contentType: fetched.contentType,
      ext: fetched.ext,
    });

    return NextResponse.json({ path }, { status: 200, headers });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to import image';
    const status = message.includes('forbidden') || message.includes('not_allowed')
      ? 403
      : message.includes('not_signed_in')
        ? 401
        : 400;
    return NextResponse.json({ error: message }, { status, headers });
  }
}
