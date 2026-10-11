// Allowed: packages/api is the one place that imports @supabase/*.
import { createClient } from '@supabase/supabase-js';

export const client = createClient;
