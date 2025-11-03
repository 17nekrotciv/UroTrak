"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Droplets,
  HeartPulse,
  ClipboardList,
  Share2,
  Download,
  BarChart3,
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { useData } from '@/contexts/data-provider';

const baseNavLinks = [
  { href: '', label: 'Painel Geral', icon: LayoutDashboard },
  { href: '/urinary', label: 'Sintomas Urinários', icon: Droplets },
  { href: '/erectile', label: 'Função Erétil', icon: HeartPulse },
  { href: '/psa', label: 'Resultados PSA', icon: ClipboardList },
  { href: '/data-summary', label: 'Resumo de Dados', icon: BarChart3 },
  { href: '/export', label: 'Exportar Dados', icon: Download },
  { href: '/share', label: 'Compartilhar App', icon: Share2 },
];

interface SidebarNavContentProps {
  onLinkClick?: () => void;
}

export default function SidebarNavContent({ onLinkClick }: SidebarNavContentProps) {
  const pathname = usePathname();
  const { userProfile, clinicDoctorProfile } = useData();

  const basePath = useMemo(() => {
    const parts = pathname.split('/');
    if (parts[1] === 'doctor-dashboard' && parts[2] === 'user-dashboard' && parts[3]) {
      return `/${parts[1]}/${parts[2]}/${parts[3]}`;
    }
    return '/dashboard';
  }, [pathname]);

  const navItems = baseNavLinks.map(link => ({
    ...link,
    href: `${basePath}${link.href}`,
  }));

  if (pathname === '/doctor-dashboard') {
    return null;
  }

  const clinic = userProfile?.clinic;
  const isDoctor = userProfile?.role === 'doctor';

  // Define qual perfil será exibido: o do próprio médico logado ou o do médico do paciente.
  const displayProfile = isDoctor ? userProfile : clinicDoctorProfile;

  return (
    <div className="flex h-full flex-col">
      <nav className="flex flex-col gap-2 p-4">
        {navItems.map((item) => {
          const isActive = item.href === basePath
            ? pathname === basePath
            : pathname.startsWith(item.href);

          return (
            <Button
              key={item.href}
              asChild
              variant={isActive ? 'secondary' : 'ghost'}
              className={cn(
                "w-full justify-start text-left h-11",
                isActive
                  ? "bg-primary/20 text-primary font-semibold hover:bg-primary/30"
                  : "hover:bg-accent/50"
              )}
              onClick={onLinkClick}
            >
              <Link href={item.href} className="flex items-center gap-3">
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            </Button>
          );
        })}
      </nav>

      <div className="mt-auto p-4 text-center text-xs text-muted-foreground space-y-2 border-t">
        {/* Usa o 'displayProfile' para mostrar os dados corretos */}
        {displayProfile ? (
          <>
            {clinic && (
              <div className="mb-2">
                <p className="text-sm font-semibold">{clinic.name}</p>
              </div>
            )}
            <p className="font-semibold">{displayProfile.displayName}</p>
            {displayProfile.especializacao && <p>{displayProfile.especializacao}</p>}
            <div>
              {displayProfile.crm && <span>CRM: {displayProfile.crm}</span>}
              {displayProfile.crm && displayProfile.rqe && <span> | </span>}
              {displayProfile.rqe && <span>RQE: {displayProfile.rqe}</span>}
            </div>
          </>
        ) : (
          // Fallback enquanto os dados carregam ou se o paciente não tem médico associado
          <>
            <div className="mb-2">
              <p className="text-sm font-semibold">Clinica Uro Onco</p>
            </div>
            <p className="font-semibold">
              <Link href="https://www.clinicauroonco.com.br/urologista-especializado-robotica" target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline">
                Dr. Bruno Benigno | Uro-oncologista
              </Link>
            </p>
            <p>CRM SP 126265 | RQE 60022</p>
            <p>Responsável Técnico</p>
          </>
        )}

        {/* O restante das informações (links, contato, etc.) */}
        <p className="pt-2">&copy; {new Date().getFullYear()} UroTrack. Todos os direitos reservados.</p>
      </div>
    </div>
  );
}