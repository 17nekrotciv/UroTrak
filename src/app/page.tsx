// src/app/page.tsx
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-provider';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        if (user.role == "user") {
          router.replace('/dashboard');
        }
        else if (user.role == "doctor") {
          router.replace('/doctor-dashboard');
        }
      } else {
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="ml-4 text-lg font-semibold text-foreground">Carregando UroTrack...</p>
    </div>
  );
}
