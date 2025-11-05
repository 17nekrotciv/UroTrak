"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { User as FirebaseUser, User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import type { UserProfile, Clinic } from "@/types";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

interface AuthContextType {
  authUser: FirebaseUser | null;
  user: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  setAuthUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 🔒 Verifica se o usuário possui um perfil no Firestore, mas não cria nada.
const checkUserInFirestore = async (firebaseUser: FirebaseUser) => {
  try {
    const userDocRef = doc(db, "users", firebaseUser.uid);
    const userDocSnap = await getDoc(userDocRef);
    if (!userDocSnap.exists()) {
      console.warn(
        "Usuário autenticado, mas sem perfil no Firestore — aguardando cadastro manual:",
        firebaseUser.uid
      );
      return null;
    }
    return userDocSnap.data();
  } catch (error) {
    console.error("Erro ao verificar usuário no Firestore:", error);
    return null;
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

        const dbUser = await checkUserInFirestore(firebaseUser);

        if (!dbUser) {
          // Mantém o usuário logado, mas ainda sem perfil completo
          setUser(null);
          setLoading(false);

          // Se ele estiver fora das páginas de login/signup → envia para /signup
          if (pathname !== "/signup") {
            const email = firebaseUser.email ? `&email=${encodeURIComponent(firebaseUser.email)}` : "";
            const name = firebaseUser.displayName ? `&name=${encodeURIComponent(firebaseUser.displayName)}` : "";
            router.replace(`/signup?uid=${firebaseUser.uid}${email}${name}`);
          }
          return;
        }

        // Caso o perfil exista no Firestore, carrega-o completamente
        const finalUser: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: dbUser.displayName || firebaseUser.displayName,
          photoURL: dbUser.photoURL || firebaseUser.photoURL,
          role: dbUser.role || "user",
          clinicId: dbUser.clinicId || null,
        };

        // Busca dados da clínica, se houver
        if (finalUser.clinicId && typeof finalUser.clinicId === "string") {
          const clinicDocRef = doc(db, "clinic", finalUser.clinicId);
          const clinicDoc = await getDoc(clinicDocRef);
          if (clinicDoc.exists()) {
            finalUser.clinic = clinicDoc.data() as Clinic;
          }
        }

        setUser(finalUser);
      } else {
        setAuthUser(null);
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [pathname, router]);

  // 🧭 Redirecionamento de acordo com o estado de autenticação
  useEffect(() => {
    if (!loading) {
      const isAuthPage = pathname === "/login" || pathname === "/signup";

      // 1️⃣ Usuário não autenticado → força para /login
      if (!authUser && !isAuthPage) {
        router.push("/login");
        return;
      }

      // 2️⃣ Usuário autenticado mas sem Firestore → fica no /signup
      if (authUser && !user && pathname !== "/signup") {
        router.replace("/signup");
        return;
      }

      // 3️⃣ Usuário autenticado e com Firestore → redireciona conforme o papel
      if (user && isAuthPage) {
        switch (user.role) {
          case "doctor":
            router.push("/doctor-dashboard");
            break;
          case "admin":
          case "user":
          default:
            router.push("/dashboard");
            break;
        }
      }
    }
  }, [authUser, user, loading, router, pathname]);

  const logout = async () => {
    setLoading(true);
    try {
      await auth.signOut();
      setUser(null);
      router.push("/login");
    } catch (error) {
      console.error("Erro ao fazer logout: ", error);
    } finally {
      setLoading(false);
    }
  };

  // Loader global durante inicialização do estado de auth
  if (loading && pathname !== "/login" && pathname !== "/signup") {
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
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
