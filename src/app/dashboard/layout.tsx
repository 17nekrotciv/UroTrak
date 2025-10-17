// src/app/dashboard/layout.tsx
"use client";

import React, { useState, useEffect, type ReactNode } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/layout/AppHeader';
import SidebarNavContent from '@/components/layout/SidebarNavContent';
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useData } from '@/contexts/data-provider';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { userProfile, loadingData } = useData();
  const router = useRouter();
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  const isLoading = loading || loadingData;

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (!isLoading && userProfile) {
    // ... e a role for 'doctor'...
    if (userProfile.role === 'doctor') {
      // ...redireciona para o dashboard do médico.
      console.log("🚫 Acesso negado. Redirecionando médico para /doctor-dashboard.");
      router.replace('/doctor-dashboard');
    }
  }

  if (isLoading || !userProfile) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
        <p className="text-foreground">Verificando permissões...</p>
      </div>
    );
  }

  if (userProfile.role === 'doctor') {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
        <p className="text-foreground">Redirecionando para o painel do médico...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-secondary/50 overflow-hidden">
      <AppHeader onMenuClick={() => setMobileSheetOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        {/* Mobile Sidebar (Sheet) */}
        <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
          <SheetContent side="left" className="w-72 p-0 bg-card">
            <SidebarNavContent onLinkClick={() => setMobileSheetOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Desktop Sidebar */}
        <aside className="hidden md:flex md:w-64 flex-col border-r bg-card overflow-y-auto">
          <SidebarNavContent />
        </aside>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-4xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}