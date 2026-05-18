import React, { createContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  createUserByAdmin: (
    email: string, 
    password: string, 
    name: string, 
    role: Role, 
    teamId?: string,
    apiKeys?: User['apiKeys'],
    modelConfig?: User['modelConfig']
  ) => Promise<void>;
  updateUserByAdmin: (userId: string, data: Partial<User> & { password?: string }) => Promise<void>;
  resetUserPassword: (email: string) => Promise<void>;
  devLogin: () => void;
  logout: () => void;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safety net: force loading=false after 5 seconds NO MATTER WHAT.
    // CRITICAL: Do NOT cancel this before fetchUserProfile finishes —
    // if that fetch hangs (slow network / bad Supabase key), this timer
    // is the only thing that gets the user past the loading screen.
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 5000);

    // onAuthStateChange is the single source of truth for auth state.
    // It fires INITIAL_SESSION on page load AND SIGNED_IN after login().
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          await fetchUserProfile(session.user);
          // Only cancel the timer AFTER the profile fetch fully resolves.
          clearTimeout(safetyTimer);
        } else {
          setUser(null);
          setLoading(false);
          clearTimeout(safetyTimer);
        }
      }
    );

    return () => {
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (supabaseUser: any) => {
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .maybeSingle();

      if (userData) {
        if ((userData as any).status === 'Inactive') {
            await supabase.auth.signOut();
            setUser(null);
            alert("Your account has been deactivated. Please contact the administrator.");
            setLoading(false);
            return;
        }

        setUser({
          id: supabaseUser.id,
          name: userData.name || supabaseUser.email?.split('@')[0] || 'User',
          email: supabaseUser.email || '',
          role: userData.role || Role.AGENT,
          status: userData.status || 'Active',
          teamId: userData.team_id,
          apiKeys:     userData.api_keys     || {},
          modelConfig: userData.model_config || {},
          preferences: userData.preferences  || {},
          createdAt: new Date(userData.created_at)
        });
      } else {
        // Automatically create the user document in Postgres if it doesn't exist
        const newUserObj = {
          id: supabaseUser.id,
          name: supabaseUser.email?.split('@')[0] || 'User',
          email: supabaseUser.email || '',
          role: Role.AGENT
        };

        const { error: insertError } = await supabase
          .from('users')
          .insert([newUserObj]);

        if (insertError) console.error("Error creating user profile in Postgres:", insertError);

        setUser({
          ...newUserObj,
          status: 'Active',
          createdAt: new Date()
        });
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    console.log('[AUTH] Attempting login for:', email);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
          throw new Error("Wrong Password! Please make sure you are typing exactly what you set in the SQL script (e.g. admin123)");
      }
      throw error;
    }
    // onAuthStateChange will fire SIGNED_IN and handle profile fetch + redirect.
    // Do NOT call fetchUserProfile here — it created a deadlock.
  };

  const signup = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    
    if (data.user) {
      const newUserObj = {
        id: data.user.id,
        name: data.user.email?.split('@')[0] || 'User',
        email: data.user.email || '',
        role: Role.AGENT
      };

      await supabase.from('users').insert([newUserObj]);
      
      setUser({
        ...newUserObj,
        status: 'Active',
        createdAt: new Date()
      });
    }
  };

  const createUserByAdmin = async (
    email: string, 
    password: string, 
    name: string, 
    role: Role, 
    teamId?: string,
    apiKeys?: User['apiKeys'],
    modelConfig?: User['modelConfig']
  ) => {
    // Use a TEMPORARY Supabase client so we don't log out the current admin.
    // persistSession: false means this signup won't touch the admin's session.
    const { createClient } = await import('@supabase/supabase-js');
    const tempClient = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // Sign up the new user — pass name & role in metadata so the
    // handle_new_user trigger can auto-create the public.users row.
    const { data: authData, error: authError } = await tempClient.auth.signUp({
      email,
      password,
      options: {
        data: { name, role },          // stored in raw_user_meta_data
        emailRedirectTo: undefined,    // no redirect needed
      },
    });

    if (authError) {
      console.error('signUp error:', authError);
      throw new Error(authError.message);
    }

    if (!authData.user) {
      throw new Error('User was not created. Please try again.');
    }

    const newUserId = authData.user.id;

    // Upsert into public.users (the trigger may have already done this,
    // but we upsert to be safe and to set team_id which the trigger doesn't know).
    const { error: dbError } = await supabase.from('users').upsert({
      id:           newUserId,
      email:        email,
      name:         name,
      role:         role,
      status:       'Active',
      team_id:      teamId || null,
      api_keys:     apiKeys     || {},
      model_config: modelConfig || {},
    }, { onConflict: 'id' });

    if (dbError) {
      console.error('public.users upsert error:', dbError);
      // Don't throw — the auth user was already created successfully
    }

    return newUserId;
  };

  const updateUserByAdmin = async (userId: string, data: Partial<User> & { password?: string }) => {
    try {
      const { password, ...updateData } = data;
      
      // Build update payload — only include fields that are provided
      const payload: Record<string, any> = {};
      if (updateData.name     !== undefined) payload.name        = updateData.name;
      if (updateData.role     !== undefined) payload.role        = updateData.role;
      if (updateData.status   !== undefined) payload.status      = updateData.status;
      if (updateData.teamId   !== undefined) payload.team_id     = updateData.teamId;
      if (updateData.apiKeys  !== undefined) payload.api_keys    = updateData.apiKeys;
      if (updateData.modelConfig !== undefined) payload.model_config = updateData.modelConfig;
      if (updateData.preferences !== undefined) payload.preferences  = updateData.preferences;

      const { error: dbError } = await supabase
        .from('users')
        .update(payload)
        .eq('id', userId);

      if (dbError) throw dbError;

      // Updating the logged-in user's own data → refresh local state
      if (userId === user?.id) {
        setUser(prev => prev ? { ...prev, ...updateData } : null);
      }

      // Password resets require Supabase Admin API (service role).
      // Workaround: send a password reset email to the user.
      if (password && password.trim().length > 0) {
        const targetUser = await supabase.from('users').select('email').eq('id', userId).single();
        if (targetUser.data?.email) {
          await supabase.auth.resetPasswordForEmail(targetUser.data.email);
          console.info('Password reset email sent to', targetUser.data.email);
        }
      }
    } catch (e) {
      console.error("Error updating user:", e);
      throw e;
    }
  };

  const resetUserPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  };
  
  const devLogin = () => {
    const devUser: User = {
      id: 'dev-user-admin',
      name: 'Dev Admin',
      email: 'admin@dev.local',
      role: Role.ADMIN, 
      status: 'Active',
      teamId: 'team_default',
      createdAt: new Date()
    };
    setUser(devUser);
    setLoading(false);
  };

  const logout = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.warn("Server sign-out failed, clearing local session...", error);
        await supabase.auth.signOut({ scope: 'local' });
      }
    } catch (err) {
      console.error("Sign-out exception:", err);
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    } finally {
      setUser(null);
      setLoading(false);
      window.location.hash = '#/login'; // Force navigation
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4" style={{ background: '#f8fafc' }}>
        {/* Spinning ring */}
        <div style={{
          width: 48, height: 48,
          border: '3px solid #e2e8f0',
          borderTop: '3px solid #0ea5e9',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        {/* Wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 900, fontSize: 22, letterSpacing: '-0.5px' }}>
          <span style={{ color: '#0ea5e9' }}>Alt</span>
          <span style={{ color: '#0f172a' }}>Leads</span>
        </div>
        <p style={{ fontSize: 12, color: '#94a3b8', marginTop: -8, letterSpacing: '0.05em' }}>Loading your workspace...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, signup, createUserByAdmin, updateUserByAdmin, resetUserPassword, devLogin, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
