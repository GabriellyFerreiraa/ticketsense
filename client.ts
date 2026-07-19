// Supabase client configuration.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://oyjgjiyeigszoxfomcwl.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable__4StxNsyIepIBC90n20ZPg_1t10KYaR";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
