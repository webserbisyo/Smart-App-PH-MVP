import type { MetadataRoute } from 'next';

import { loadStorefront } from '../features/shell/shop';

const KNOWN_SHOPS = ['juans-cafe', 'tala-apparel'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://smartapp.ph';
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
  ];

  for (const slug of KNOWN_SHOPS) {
    try {
      const storefront = await loadStorefront(slug);
      if (!storefront) {
        // Fallback: still include the demo shop canonical pages even if DB is not reached during offline builds
        entries.push(
          { url: `${siteUrl}/${slug}`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
          { url: `${siteUrl}/${slug}/menu`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
          { url: `${siteUrl}/${slug}/privacy`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
          { url: `${siteUrl}/${slug}/rewards`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
        );
        continue;
      }

      entries.push({
        url: `${siteUrl}/${slug}`,
        lastModified: now,
        changeFrequency: 'daily',
        priority: 0.9,
      });

      entries.push({
        url: `${siteUrl}/${slug}/menu`,
        lastModified: now,
        changeFrequency: 'daily',
        priority: 0.8,
      });

      entries.push({
        url: `${siteUrl}/${slug}/privacy`,
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.3,
      });

      if (storefront.stampRule) {
        entries.push({
          url: `${siteUrl}/${slug}/rewards`,
          lastModified: now,
          changeFrequency: 'weekly',
          priority: 0.6,
        });
      }
    } catch {
      // Graceful fallback for static build without local database running
      entries.push(
        { url: `${siteUrl}/${slug}`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
        { url: `${siteUrl}/${slug}/menu`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
        { url: `${siteUrl}/${slug}/privacy`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
      );
    }
  }

  return entries;
}
