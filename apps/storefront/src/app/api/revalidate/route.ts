import 'server-only';

import { revalidatePath, revalidateTag } from 'next/cache';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createPublicClient } from '@smartapp/api';

/**
 * On-demand revalidation endpoint for shop storefront data (SF3 step 8, decision SF-20).
 * Checks the owner's JWT and refreshes the cache tag `shop:<slug>`.
 */
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'misconfigured' }, { status: 500 });
  }

  const client = createPublicClient({ url: supabaseUrl, publishableKey: supabaseKey });
  const { data: { user }, error: authError } = await client.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let slug: string | null = null;
  try {
    const body: unknown = await req.json();
    if (typeof body === 'object' && body !== null && 'slug' in body && typeof body.slug === 'string') {
      slug = body.slug.trim().toLowerCase();
    }
  } catch {
    // If not valid JSON, check search params
    slug = req.nextUrl.searchParams.get('slug');
  }

  if (!slug) {
    return NextResponse.json({ error: 'slug_required' }, { status: 400 });
  }

  // Verify the authenticated user is an active member/owner of this shop
  const { data: member, error: memberError } = await client
    .from('tenant_members')
    .select('id, tenants!inner(slug, status)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .eq('tenants.slug', slug)
    .maybeSingle();

  if (memberError || !member) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // Invalidate the cache tag for this shop
  revalidateTag(`shop:${slug}`, { expire: 0 });
  revalidatePath(`/${slug}`, 'layout');

  return NextResponse.json({ revalidated: true, slug, now: Date.now() });
}
