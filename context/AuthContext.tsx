import React, { createContext, useState, useEffect, useRef } from 'react';
import { User, Role } from '../types';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
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
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const DEV_STORAGE_KEY = 'altleads-dev-user';

/** Map a DB row + Supabase auth user into the app's User shape. */
function mapDbRowToUser(supabaseUser: any, row: any): User {
  return {
    id: supabaseUser.id,
    name: row.name || supabaseUser.email?.split('@')[0] || 'User',
    email: supabaseUser.email || '',
    role: row.role || Role.AGENT,
    status: row.status || 'Active',
    teamId: row.team_id,
    apiKeys: row.api_keys || {},
    modelConfig: row.model_config || {},
    preferences: row.preferences || {},
    createdAt: new Date(row.created_at),
  };
}

/** Safely parse a localStorage value; returns null on any failure. */
function safeParseStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    localStorage.removeItem(key); // nuke corrupt data
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  // loading=true blocks ProtectedRoute from making any redirect decisions
  const [loading, setLoading] = useState(true);

  /**
   * hydrationDone ref tracks whether the FIRST auth resolve has happened.
   * The onAuthStateChange listener is IGNORED until hydration completes to
   * prevent the initial SIGNED_IN event from triggering a duplicate profile fetch.
   */
  const hydrationDone = useRef(false);

  // ── Profile fetcher (single authority) ─────────────────────────────────────
  const fetchAndSetProfile = async (supabaseUser: any): Promise<void> => {
    // Individual timeout so a slow Supabase query never hangs the spinner
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));

    try {
      const fetchPromise = supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .maybeSingle();

      const result = await Promise.race([fetchPromise, timeoutPromise]);

      // If timed out, result is null
      if (!result) {
        console.warn('[AUTH] Profile fetch timed out — preserving existing session if available');
        setUser(prev => prev || mapDbRowToUser(supabaseUser, {}));
        return;
      }

      const { data: row, error } = result as Awaited<typeof fetchPromise>;

      if (error) {
        console.warn('[AUTH] Profile fetch error:', error.message);
        setUser(prev => prev || mapDbRowToUser(supabaseUser, {}));
        return;
      }

      if (row) {
        if (row.status === 'Inactive') {
          console.warn('[AUTH] Account is Inactive. Signing out.');
          await supabase.auth.signOut({ scope: 'local' });
          setUser(null);
          alert('Your account has been deactivated. Please contact the administrator.');
          return;
        }
        setUser(mapDbRowToUser(supabaseUser, row));
      } else {
        // Auto-provision a default profile for new/migrated users
        console.warn('[AUTH] No DB row found — creating default profile');
        const newRow = {
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          name: supabaseUser.email?.split('@')[0] || 'User',
          role: Role.AGENT,
          status: 'Active',
        };
        const { error: insertErr } = await supabase.from('users').insert([newRow]);
        if (insertErr) console.error('[AUTH] Auto-provision insert error:', insertErr.message);
        setUser({ ...newRow, createdAt: new Date() } as User);
      }
    } catch (err: any) {
      console.error('[AUTH] fetchAndSetProfile exception:', err?.message);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // ── Mount: single hydration pass ───────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    // Hard safety net — 3 s ceiling. Prevents eternal spinner if Supabase
    // is completely unreachable (e.g. no network, wrong key, expired token).
    const safetyTimer = setTimeout(() => {
      console.warn('[AUTH] Safety timeout — forcing session resolve to false');
      setLoading(false);
      hydrationDone.current = true;
    }, 3000);

    const hydrate = async () => {
      console.log('[AUTH] Hydration start');

      // ── 1. Developer bypass (highest priority) ────────────────────────────
      const savedDev = safeParseStorage<User>(DEV_STORAGE_KEY);
      if (savedDev) {
        console.log('[AUTH] Dev bypass session restored');
        if (!cancelled) {
          setUser({ ...savedDev, createdAt: new Date(savedDev.createdAt) });
          setLoading(false);
          hydrationDone.current = true;
          clearTimeout(safetyTimer);
        }
        return;
      }

      // ── 2. Supabase session restore ───────────────────────────────────────
      try {
        // Race getSession against a 2.5s timeout — stale tokens can hang forever
        const sessionTimeoutPromise = new Promise<{ data: { session: null }, error: null }>(
          (resolve) => setTimeout(() => resolve({ data: { session: null }, error: null }), 2500)
        );
        const { data: { session }, error } = await Promise.race([
          supabase.auth.getSession(),
          sessionTimeoutPromise,
        ]);

        if (error) {
          // Invalid / corrupt stored token — wipe and show login
          console.warn('[AUTH] getSession error — clearing stored session:', error.message);
          await supabase.auth.signOut({ scope: 'local' });
          if (!cancelled) { setUser(null); setLoading(false); }
          hydrationDone.current = true;
          clearTimeout(safetyTimer);
          return;
        }

        if (session?.user) {
          console.log('[AUTH] Valid session found for:', session.user.email);
          if (!cancelled) await fetchAndSetProfile(session.user);
        } else {
          console.log('[AUTH] No active session — showing login');
          if (!cancelled) { setUser(null); setLoading(false); }
        }
      } catch (err: any) {
        console.error('[AUTH] Hydration exception:', err?.message);
        if (!cancelled) { setUser(null); setLoading(false); }
      }

      hydrationDone.current = true;
      clearTimeout(safetyTimer);
    };

    hydrate();

    // ── 3. Auth state listener (only active AFTER hydration) ─────────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Ignore the initial synthetic event that fires during hydration.
        // This is the root cause of the old double-fetch / race condition.
        if (!hydrationDone.current) return;
        if (cancelled) return;

        console.log('[AUTH] onAuthStateChange:', event);

        switch (event) {
          case 'SIGNED_IN':
          case 'TOKEN_REFRESHED':
          case 'USER_UPDATED': {
            if (session?.user) {
              // Don't clobber a dev bypass session with a real session event
              const devCheck = safeParseStorage<User>(DEV_STORAGE_KEY);
              if (!devCheck) {
                // Only show loading screen if we don't already have an active user session
                setUser(prev => {
                  if (!prev) setLoading(true);
                  return prev;
                });
                await fetchAndSetProfile(session.user);
              }
            }
            break;
          }
          case 'SIGNED_OUT': {
            localStorage.removeItem(DEV_STORAGE_KEY);
            setUser(null);
            setLoading(false);
            break;
          }
          case 'PASSWORD_RECOVERY': {
            // No user state change needed
            break;
          }
          default:
            break;
        }
      }
    );

    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────────

  const login = async (email: string, password: string): Promise<void> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.toLowerCase().includes('invalid login credentials')) {
        throw new Error('Incorrect email or password. Please try again.');
      }
      throw error;
    }
    // onAuthStateChange → SIGNED_IN will call fetchAndSetProfile
  };

  const signup = async (email: string, password: string): Promise<void> => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (data.user) {
      const newRow = {
        id: data.user.id,
        name: data.user.email?.split('@')[0] || 'User',
        email: data.user.email || '',
        role: Role.AGENT,
      };
      await supabase.from('users').insert([newRow]).throwOnError();
      setUser({ ...newRow, status: 'Active', createdAt: new Date() } as User);
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
  ): Promise<void> => {
    const { createClient } = await import('@supabase/supabase-js');
    const tempClient = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { data: authData, error: authError } = await tempClient.auth.signUp({
      email,
      password,
      options: { data: { name, role } },
    });

    if (authError) throw new Error(authError.message);
    if (!authData.user) throw new Error('User was not created. Please try again.');

    const { error: dbError } = await supabase.from('users').upsert({
      id: authData.user.id,
      email,
      name,
      role,
      status: 'Active',
      team_id: teamId || null,
      api_keys: apiKeys || {},
      model_config: modelConfig || {},
    }, { onConflict: 'id' });

    if (dbError) console.error('[AUTH] createUserByAdmin upsert error:', dbError.message);
  };

  const updateUserByAdmin = async (
    userId: string,
    data: Partial<User> & { password?: string }
  ): Promise<void> => {
    const { password, ...updateData } = data;
    const payload: Record<string, any> = {};
    if (updateData.name !== undefined) payload.name = updateData.name;
    if (updateData.role !== undefined) payload.role = updateData.role;
    if (updateData.status !== undefined) payload.status = updateData.status;
    if (updateData.teamId !== undefined) payload.team_id = updateData.teamId;
    if (updateData.apiKeys !== undefined) payload.api_keys = updateData.apiKeys;
    if (updateData.modelConfig !== undefined) payload.model_config = updateData.modelConfig;
    if (updateData.preferences !== undefined) payload.preferences = updateData.preferences;

    const { error } = await supabase.from('users').update(payload).eq('id', userId);
    if (error) throw error;

    // Reflect changes on the currently-logged-in user immediately
    if (userId === user?.id) {
      setUser(prev => prev ? { ...prev, ...updateData } : null);
    }

    if (password?.trim()) {
      const { data: targetUser } = await supabase
        .from('users').select('email').eq('id', userId).single();
      if (targetUser?.email) {
        await supabase.auth.resetPasswordForEmail(targetUser.email);
      }
    }
  };

  const resetUserPassword = async (email: string): Promise<void> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  };

  const devLogin = (): void => {
    const devUser: User = {
      id: 'dev-user-admin',
      name: 'Dev Admin',
      email: 'admin@dev.local',
      role: Role.ADMIN,
      status: 'Active',
      teamId: 'team_default',
      createdAt: new Date(),
    };
    localStorage.setItem(DEV_STORAGE_KEY, JSON.stringify(devUser));
    setUser(devUser);
    setLoading(false);
  };

  const logout = async (): Promise<void> => {
    try {
      localStorage.removeItem(DEV_STORAGE_KEY);
      // Try global sign-out; fall back to local-only to avoid network errors blocking logout
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.warn('[AUTH] Global sign-out failed, using local scope:', error.message);
        await supabase.auth.signOut({ scope: 'local' });
      }
    } catch (err: any) {
      console.error('[AUTH] logout exception:', err?.message);
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    } finally {
      setUser(null);
      setLoading(false);
      // onAuthStateChange SIGNED_OUT will also fire, which is fine — it's idempotent
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: 16,
          background: '#f8fafc',
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            border: '3px solid #e2e8f0',
            borderTop: '3px solid #0ea5e9',
            borderRadius: '50%',
            animation: 'altleads-spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes altleads-spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 900, fontSize: 22, letterSpacing: '-0.5px' }}>
          <span style={{ color: '#0ea5e9' }}>Alt</span>
          <span style={{ color: '#0f172a' }}>Leads</span>
        </div>
        <p style={{ fontSize: 12, color: '#94a3b8', marginTop: -8, letterSpacing: '0.05em' }}>
          Loading your workspace...
        </p>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        createUserByAdmin,
        updateUserByAdmin,
        resetUserPassword,
        devLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
