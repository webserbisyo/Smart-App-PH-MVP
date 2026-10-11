// Breaks: packages/ui does not fetch data: no Supabase, no @smartapp/api.
import { createClient } from '@supabase/supabase-js';
import { useOrders } from '@smartapp/api';

export const both = [createClient, useOrders];
