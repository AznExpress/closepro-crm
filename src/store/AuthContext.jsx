import { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AuthContext = createContext(null);

// Demo user for when Supabase is not configured
const DEMO_USER = {
  id: 'demo-user',
  email: 'demo@closepro.app',
  user_metadata: {
    full_name: 'Jane Doe'
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      // Demo mode - auto-login as demo user
      setUser(DEMO_USER);
      setIsDemo(true);
      setLoading(false);
      return;
    }

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email, password, fullName) => {
    if (!isSupabaseConfigured()) {
      return { error: { message: 'Supabase not configured. Running in demo mode.' } };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });

    return { data, error };
  };

  const signIn = async (email, password) => {
    if (!isSupabaseConfigured()) {
      // Demo mode - accept any credentials
      setUser(DEMO_USER);
      return { data: { user: DEMO_USER }, error: null };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    return { data, error };
  };

  const signOut = async () => {
    if (!isSupabaseConfigured()) {
      setUser(null);
      return { error: null };
    }

    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const resetPassword = async (email) => {
    if (!isSupabaseConfigured()) {
      return { error: { message: 'Supabase not configured. Running in demo mode.' } };
    }

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });

    return { data, error };
  };

  const value = {
    user,
    loading,
    isDemo,
    isAuthenticated: !!user,
    signUp,
    signIn,
    signOut,
    resetPassword,
    getUserName: () => {
      if (!user) return 'Guest';
      return user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
    },
    getUserInitials: () => {
      if (!user) return '?';
      const name = user.user_metadata?.full_name;
      if (name) {
        const parts = name.split(' ');
        return parts.map(p => p[0]).join('').toUpperCase().slice(0, 2);
      }
      return user.email?.[0]?.toUpperCase() || '?';
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

