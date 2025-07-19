// src/contexts/auth-provider.tsx
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase'; // import db
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore'; // import firestore functions
import type { UserProfile } from '@/types';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// This function will handle creating the user profile in Firestore if it doesn't exist.
// We are centralizing the logic here.
const manageUserInFirestore = async (firebaseUser: FirebaseUser) => {
  const userDocRef = doc(db, "users", firebaseUser.uid);
  try {
    const userDocSnap = await getDoc(userDocRef);
    if (!userDocSnap.exists()) {
      // If the user document doesn't exist in our database, create it.
      await setDoc(userDocRef, {
        displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário Anônimo',
        email: firebaseUser.email,
        photoURL: firebaseUser.photoURL,
        createdAt: Timestamp.fromDate(new Date()),
        providerId: firebaseUser.providerData[0]?.providerId || 'email',
      });
    }
  } catch (error) {
    console.error("Error managing user in Firestore:", error);
    // Optionally, we could log out the user or show a global error
  }
};


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // When a user logs in, ensure their profile exists in our "urotrak database" (Firestore)
        await manageUserInFirestore(firebaseUser);
        
        // Also get the potentially updated profile from Firestore
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const dbUser = userDocSnap.data();
           setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: dbUser.displayName || firebaseUser.displayName,
              photoURL: dbUser.photoURL || firebaseUser.photoURL,
           });
        } else {
           setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
          });
        }

      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading) {
      const isAuthPage = pathname === '/login' || pathname === '/signup';
      if (!user && !isAuthPage) {
        router.push('/login');
      } else if (user && isAuthPage) {
        router.push('/dashboard');
      }
    }
  }, [user, loading, router, pathname]);

  const logout = async () => {
    setLoading(true);
    try {
      await auth.signOut();
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error("Error signing out: ", error);
      // Handle error appropriately, e.g., show a toast message
    } finally {
      setLoading(false);
    }
  };
  
  if (loading && (pathname !== '/login' && pathname !== '/signup')) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }


  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
