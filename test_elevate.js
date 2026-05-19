import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^"|"$/g, '');
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  try {
    console.log('Logging in as prashantk@amplior.com...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'prashantk@amplior.com',
      password: 'amp123'
    });

    if (authError) {
      console.error('Login error:', authError.message);
      return;
    }

    console.log('Attempting to elevate admin@amplior.com to SUPER_ADMIN...');
    const { data: users, error: updateError } = await supabase
      .from('users')
      .update({ role: 'SUPER_ADMIN', name: 'Super Admin', status: 'Active' })
      .eq('email', 'admin@amplior.com')
      .select();

    if (updateError) {
      console.error('Update Error:', updateError.message);
    } else {
      console.log('Update Success! Result:', users);
    }
  } catch (err) {
    console.error('Exception:', err);
  }
}
test();
