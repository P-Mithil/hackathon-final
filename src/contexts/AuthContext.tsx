
'use client';

import type { User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading) {
      const isAuthPage = pathname.startsWith('/auth');
      if (currentUser && isAuthPage) {
        router.push('/'); // Redirect to dashboard if logged in and on auth page
      } else if (!currentUser && !isAuthPage) {
        router.push('/auth/login'); // Redirect to login if not logged in and not on auth page
      }
    }
  }, [currentUser, loading, router, pathname]);

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null); // Clear user state immediately
      router.push('/auth/login'); // Redirect to login after sign out
    } catch (error) {
      console.error("Error signing out: ", error);
      // Optionally, show a toast message for sign-out error
    }
  };

  if (loading) {
    const isAuthPage = pathname.startsWith('/auth');
     // Don't show full page loader on auth pages during initial load
    if (!isAuthPage && !currentUser) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-background">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
      );
    }
  }
  
  // Allow access to auth pages even when loading or if no user (to avoid redirect loop)
  if (!loading && !currentUser && !pathname.startsWith('/auth')) {
    // This case should ideally be handled by the redirect logic above,
    // but as a fallback, we show a loader or null to prevent rendering protected content.
    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
      );
  }


  return (
    <AuthContext.Provider value={{ currentUser, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
