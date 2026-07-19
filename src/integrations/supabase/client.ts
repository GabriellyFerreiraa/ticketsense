// Supabase client configuration.
// Create a project at https://supabase.com/dashboard, then paste your own
// Project URL and anon public key below (Project Settings → API).
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "COLE_SUA_PROJECT_URL_AQUI";
const SUPABASE_PUBLISHABLE_KEY = "COLE_SUA_ANON_KEY_AQUI";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
