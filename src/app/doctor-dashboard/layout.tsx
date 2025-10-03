// src/app/doctor-dashboard/layout.tsx
"use client";

import React, { useState, useEffect, type ReactNode } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import AppHeader from '@/components/layout/AppHeader';
import SidebarNavContent from '@/components/layout/SidebarNavContent';
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

    // --- LÓGICA CORRIGIDA ---
    // A sidebar só deve aparecer quando o médico estiver na sub-rota de um paciente.
    const isViewingPatientAsDoctor = pathname.includes('/doctor-dashboard/user-dashboard/');

    // A variável 'showSidebar' agora depende diretamente da condição acima.
    const showSidebar = isViewingPatientAsDoctor;

    useEffect(() => {
        if (!loading && !user) {
            router.replace('/login');
        }
    }, [user, loading, router]);

    if (loading || !user) {
        return <div className="flex h-screen items-center justify-center">Carregando...</div>;
    }

    // O conteúdo da sidebar permanece o mesmo, focado em voltar para a lista de pacientes.
    const sidebarContent = (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b">
                <Button asChild variant="outline" className="w-full justify-start">
                    <Link href="/doctor-dashboard">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar para Pacientes
                    </Link>
                </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
                <SidebarNavContent onLinkClick={() => setMobileSheetOpen(false)} />
            </div>
        </div>
    );

    return (
        <div className="flex h-screen flex-col bg-secondary/50 overflow-hidden">
            <AppHeader onMenuClick={() => setMobileSheetOpen(true)} />
            <div className="flex flex-1 overflow-hidden">
                {/* A sidebar (desktop e mobile) agora é renderizada condicionalmente */}
                {showSidebar && (
                    <>
                        <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
                            <SheetContent side="left" className="w-72 p-0 bg-card">
                                {sidebarContent}
                            </SheetContent>
                        </Sheet>
                        <aside className="hidden md:flex md:w-64 flex-col border-r bg-card overflow-y-auto">
                            {sidebarContent}
                        </aside>
                    </>
                )}

                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    <div className="mx-auto max-w-4xl">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}