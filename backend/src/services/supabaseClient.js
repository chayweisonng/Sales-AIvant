const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
// Use the secret key so we can bypass RLS for server-side admin operations
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !supabaseKey) {
  console.warn('WARNING: SUPABASE_URL or SUPABASE_SERVICE_ROLE is missing.');
}

// Admin client for bypassing RLS (server-side operations)
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

// Client for user-facing auth operations (login/signup)
const supabaseAuth = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY, {
  auth: { persistSession: false }
});

module.exports = { supabase, supabaseAuth };
