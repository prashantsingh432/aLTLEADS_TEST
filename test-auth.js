import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ilybntiuvpeomicvfrmz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlseWJudGl1dnBlb21pY3Zmcm16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NDg0MjcsImV4cCI6MjA5NDMyNDQyN30.1SjcBDuvZZ54d4EVgFgSWgPhOzHNLwIXMQ7v-LsGDSA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testAuth() {
    console.log("Attempting to login...");
    const { data, error } = await supabase.auth.signInWithPassword({
        email: 'prashantk@amplior.com',
        password: 'amp123'
    });
    
    if (error) {
        console.error("Login Failed:", error.message);
        
        console.log("Attempting to sign up instead...");
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: 'prashantk@amplior.com',
            password: 'amp123'
        });
        
        if (signUpError) {
            console.error("SignUp Failed:", signUpError.message);
        } else {
            console.log("SignUp Success! User:", signUpData.user?.email);
            if (signUpData.session == null) {
                console.log("NOTE: Email confirmation might be required in Supabase settings.");
            }
        }
    } else {
        console.log("Login Success! User:", data.user?.email);
    }
}

testAuth();
