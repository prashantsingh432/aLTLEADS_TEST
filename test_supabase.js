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

console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey ? (supabaseKey.substring(0, 15) + '...') : 'undefined');

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  try {
    const { data, error } = await supabase.from('users').select('*');
    console.log('--- USERS ---');
    console.log('Data:', data);
    console.log('Error:', error);

    const { data: teams, error: teamsError } = await supabase.from('teams').select('*');
    console.log('--- TEAMS ---');
    console.log('Data:', teams);
    console.log('Error:', teamsError);
  } catch (err) {
    console.error('Exception:', err);
  }
}
test();
