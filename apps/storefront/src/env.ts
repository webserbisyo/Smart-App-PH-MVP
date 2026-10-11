import { z } from 'zod';

const Env = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});
export type Env = z.infer<typeof Env>;

/**
 * The storefront's environment, checked. Next inlines NEXT_PUBLIC_ values at build time only when they
 * are read by their full name, so each one is listed here. Nothing uses Supabase yet (P3b).
 */
export function readEnv(): Env {
  const parsed = Env.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Storefront environment is missing or wrong: ${missing}. Copy apps/storefront/.env.example to .env.local and fill it in.`);
  }
  return parsed.data;
}
