import 'server-only';

import { timingSafeEqual } from 'node:crypto';
import { type NextRequest, NextResponse } from 'next/server';
import { createPublicClient } from '@smartapp/api';
import { dispatchPushBatch } from '@smartapp/api/server';

function secureCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function POST(req: NextRequest) {
  const expectedSecret = process.env.PUSH_DISPATCH_SECRET;
  if (!expectedSecret) {
    return NextResponse.json({ error: 'misconfigured' }, { status: 500 });
  }

  const headerSecret =
    req.headers.get('x-push-secret') ??
    req.headers.get('x-push-dispatch-secret') ??
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  if (!headerSecret || !secureCompare(headerSecret, expectedSecret)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const vapidSubject = process.env.VAPID_SUBJECT;
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

  if (!vapidSubject || !vapidPublicKey || !vapidPrivateKey) {
    return NextResponse.json({ error: 'vapid_not_configured' }, { status: 500 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'supabase_not_configured' }, { status: 500 });
  }

  const client = createPublicClient({ url: supabaseUrl, publishableKey: supabaseKey });

  try {
    const results = await dispatchPushBatch(client, expectedSecret, {
      subject: vapidSubject,
      publicKey: vapidPublicKey,
      privateKey: vapidPrivateKey,
    });

    return NextResponse.json({ ok: true, count: results.length });
  } catch {
    return NextResponse.json({ error: 'dispatch_failed' }, { status: 500 });
  }
}
