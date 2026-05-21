import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Use localStorage so sessions persist across tabs/refreshes
    persistSession: true,
    // Automatically refresh token before expiry
    autoRefreshToken: true,
    // Detect auth code in URL (needed for magic links, OAuth)
    detectSessionInUrl: false,
    // Use a unique storage key so stale sessions from old projects don't conflict
    storageKey: 'altleads-auth-token',
  },
});

