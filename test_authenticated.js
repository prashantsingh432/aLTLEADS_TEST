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
    console.log('Logging in as admin@amplior.com...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@amplior.com',
      password: 'admin@amplior.com'
    });

    if (authError) {
      console.error('Login error:', authError.message);
      return;
    }

    console.log('Login successful! Logged in UID:', authData.user.id);

    console.log('Querying public.users...');
    const { data: users, error: usersError } = await supabase.from('users').select('*');
    console.log('--- USERS ---');
    console.log('Data:', users);
    console.log('Error:', usersError);

    console.log('Querying public.teams...');
    const { data: teams, error: teamsError } = await supabase.from('teams').select('*');
    console.log('--- TEAMS ---');
    console.log('Data:', teams);
    console.log('Error:', teamsError);
  } catch (err) {
    console.error('Exception:', err);
  }
}
test();
