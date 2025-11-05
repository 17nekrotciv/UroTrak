// src/app/doctor-dashboard/user-dashboard/[userId]/layout.tsx
"use client";

import React, { type ReactNode, useEffect } from 'react';
import { useParams } from 'next/navigation'; // Importa o hook para ler a URL
import { useData } from '@/contexts/data-provider';
import { Alert, AlertDescription } from "@/components/ui/alert"; // Importa o componente de Alerta
import { User, Loader2 } from 'lucide-react'; // Importa ícones

// O layout agora vai buscar e exibir o nome do paciente
export default function DoctorPatientViewLayout({ children }: { children: ReactNode }) {
    const params = useParams(); // Hook para pegar os parâmetros da URL
    const { loadViewedUserData, viewedUserProfile, loadingViewedUser } = useData();

    // Pega o userId do parâmetro da URL
    const userId = Array.isArray(params.userId) ? params.userId[0] : params.userId as string;

    useEffect(() => {
        let unsubscribe: () => void;
        if (userId) {
            // Carrega os dados do paciente específico
            unsubscribe = loadViewedUserData(userId);
        }

        // Função de limpeza para parar de "ouvir" os dados quando o médico sair da página
        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [userId, loadViewedUserData]);

    return (
        <div>
            {/* Este é o banner que sinaliza qual paciente está sendo visto.
              Ele aparecerá em todas as sub-páginas (Resumo, Urinário, PSA, etc.)
            */}
            <Alert variant="default" className="mb-6 border-primary/30 bg-primary/10 font-semibold text-primary shadow-sm">
                <User className="h-5 w-5 !text-primary" />
                <AlertDescription>
                    {loadingViewedUser ? (
                        <span className="flex items-center">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Carregando dados do paciente...
                        </span>
                    ) : (
                        `Você está visualizando o painel de: ${viewedUserProfile?.displayName || 'Paciente'}`
                    )}
                </AlertDescription>
            </Alert>

            {/* O conteúdo da página (page.tsx, urinary/page.tsx, etc.) será renderizado abaixo */}
            {children}
        </div>
    );
}