"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User as FirebaseUser, User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import type { UserProfile, Clinic } from '@/types'; // Importando Clinic
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface AuthContextType {
  authUser: FirebaseUser | null
  user: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  setAuthUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Garante que um perfil de usuário exista no Firestore no primeiro login.
const manageUserInFirestore = async (firebaseUser: FirebaseUser) => {
  const userDocRef = doc(db, "users", firebaseUser.uid);
  try {
    const userDocSnap = await getDoc(userDocRef);
    if (!userDocSnap.exists()) {
      await setDoc(userDocRef, {
        displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário Anônimo',
        email: firebaseUser.email,
        photoURL: firebaseUser.photoURL,
        createdAt: Timestamp.fromDate(new Date()),
        providerId: firebaseUser.providerData[0]?.providerId || 'email',
        role: 'user', // Define um 'role' padrão
      });
    }
  } catch (error) {
    console.error("Erro ao gerenciar usuário no Firestore:", error);
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        setAuthUser(firebaseUser);

        await manageUserInFirestore(firebaseUser);

        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const dbUser = userDocSnap.data();
          // 1. Cria um objeto base com os dados do usuário
          const finalUser: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: dbUser.displayName || firebaseUser.displayName,
            photoURL: dbUser.photoURL || firebaseUser.photoURL,
            role: dbUser.role || 'user',
            clinicId: dbUser.clinicId || null,
          };

          // 2. Se houver um clinicId, busca os dados da clínica
          if (finalUser.clinicId && typeof finalUser.clinicId === 'string') {
            const clinicDocRef = doc(db, 'clinic', finalUser.clinicId);
            const clinicDoc = await getDoc(clinicDocRef);
            if (clinicDoc.exists()) {
              // 3. Anexa os dados da clínica ao objeto final do usuário
              finalUser.clinic = clinicDoc.data() as Clinic;
            }
          }

          setUser(finalUser); // Define o estado com o usuário completo
        } else {
          // Fallback raro caso o documento não seja encontrado após a criação.
          console.error("Documento do usuário não pôde ser lido do Firestore.");
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            role: 'user',
            clinicId: ''
          });
          setAuthUser(null);
        }
      } else {
        setAuthUser(null);
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Efeito para gerenciar redirecionamentos com base no estado de autenticação e na rota.
  useEffect(() => {
    if (!loading) {
      const isAuthPage = pathname === '/login' || pathname === '/signup';
      if (!user && !isAuthPage) {
        router.push('/login');
      } else if (user && isAuthPage) {
        switch (user.role) {
          case 'admin':
          case 'user':
            router.push('/dashboard');
            break;
          case 'doctor':
            router.push('/doctor-dashboard');
            break;
          default:
            router.push('/dashboard');
        }
      }
    }
  }, [authUser, user, loading, router, pathname]);

  const logout = async () => {
    setLoading(true);
    try {
      await auth.signOut();
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error("Erro ao fazer logout: ", error);
    } finally {
      setLoading(false);
    }
  };

  // Exibe um loader global enquanto a verificação inicial de auth está acontecendo.
  if (loading && (pathname !== '/login' && pathname !== '/signup')) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ authUser, user, loading, setAuthUser, logout }}>
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