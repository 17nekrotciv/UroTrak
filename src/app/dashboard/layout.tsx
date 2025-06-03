// src/app/dashboard/layout.tsx
"use client";

import React, { useState, useEffect, type ReactNode } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/layout/AppHeader';
import SidebarNavContent from '@/components/layout/SidebarNavContent';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"; // Sheet is client component
import { Button } from '@/components/ui/button'; // Button is client component
import { Menu } from 'lucide-react'; // Lucide icons are client components

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    // This can be a global loading spinner or skeleton screen
    return <div className="flex h-screen items-center justify-center">Carregando...</div>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-secondary/50">
      <AppHeader onMenuClick={() => setMobileSheetOpen(true)} />
      <div className="flex flex-1">
        {/* Mobile Sidebar (Sheet) */}
        <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
          {/* SheetTrigger is handled by AppHeader's menu button */}
          <SheetContent side="left" className="w-72 p-0 bg-card">
            <SidebarNavContent onLinkClick={() => setMobileSheetOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Desktop Sidebar */}
        <aside className="hidden md:flex md:w-64 flex-col border-r bg-card">
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
