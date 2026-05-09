import { createClient } from '@supabase/supabase-js';
import { syncRealtimeAuthToken } from './realtimeAuth';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'sb-auth-token',
    storage: window.localStorage,
  },
});

export const setSupabaseRealtimeAuth = async (token) => {
  await syncRealtimeAuthToken(supabase.realtime, token);
};
