// Breaks: only packages/api may import @supabase/*.
import { createClient } from '@supabase/supabase-js';

export const client = createClient;
