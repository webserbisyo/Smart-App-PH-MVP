import type { ApiClient } from '../client';

/**
 * Triggers on-demand revalidation of the storefront for a shop slug (SF3 step 8, decision SF-20).
 * Passes the signed-in owner's access token to authenticate.
 */
export async function revalidateStorefront(client: ApiClient, slug: string): Promise<boolean> {
  try {
    const { data } = await client.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return false;

    const base =
      typeof window !== 'undefined'
        ? (process.env.NEXT_PUBLIC_STOREFRONT_URL || '')
        : (process.env.STOREFRONT_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');

    const res = await fetch(`${base}/api/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ slug }),
    });

    return res.ok;
  } catch {
    // Non-blocking: background cache revalidation failure should not break the owner's save.
    return false;
  }
}
