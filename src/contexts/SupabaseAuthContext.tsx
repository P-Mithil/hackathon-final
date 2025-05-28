
'use client';

import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface SupabaseAuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  // We can add signIn and signUp methods to this context later
  // if other components need to trigger them directly.
}

const SupabaseAuthContext = createContext<SupabaseAuthContextType | undefined>(undefined);

export function useSupabaseAuth() {
  const context = useContext(SupabaseAuthContext);
  if (context === undefined) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  }
  return context;
}

interface SupabaseAuthProviderProps {
  children: ReactNode;
}

export function SupabaseAuthProvider({ children }: SupabaseAuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setLoading(true);
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false); // Ensure loading is false on any auth event
      }
    );

    return () => subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading) {
      const isAuthPage = pathname.startsWith('/auth');
      if (user && isAuthPage) {
        router.push('/'); // Redirect to dashboard if logged in and on auth page
      } else if (!user && !isAuthPage) {
        router.push('/auth/login'); // Redirect to login if not logged in and not on auth page
      }
    }
  }, [user, loading, router, pathname]);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out with Supabase: ", error);
      // Optionally, show a toast message
    } else {
      // setUser(null); // State will be updated by onAuthStateChange
      // setSession(null); // State will be updated by onAuthStateChange
      router.push('/auth/login'); // Redirect to login after sign out
    }
  };

  if (loading) {
    const isAuthPage = pathname.startsWith('/auth');
    // Don't show full page loader on auth pages during initial load or if user might exist briefly
    if (!isAuthPage && !user) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-background">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
      );
    }
  }
  
  // This is a fallback to prevent rendering protected content if not logged in 
  // and not on an auth page, especially during brief loading flickers.
  if (!loading && !user && !pathname.startsWith('/auth')) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
      );
  }

  return (
    <SupabaseAuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </SupabaseAuthContext.Provider>
  );
}
