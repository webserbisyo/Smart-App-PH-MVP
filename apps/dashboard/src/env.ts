import { z } from 'zod';

const Env = z.object({
  VITE_SUPABASE_URL: z.url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});
export type Env = z.infer<typeof Env>;

/** The dashboard's environment, checked. Nothing uses Supabase yet (P3b). */
export function readEnv(): Env {
  const parsed = Env.safeParse({
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  });
  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Dashboard environment is missing or wrong: ${missing}. Copy apps/dashboard/.env.example to .env.local and fill it in.`);
  }
  return parsed.data;
}
