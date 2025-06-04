// src/components/layout/SidebarNavContent.tsx
"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
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

const navItems = [
  { href: '/dashboard', label: 'Painel Geral', icon: LayoutDashboard },
  { href: '/dashboard/urinary', label: 'Sintomas Urinários', icon: Droplets },
  { href: '/dashboard/erectile', label: 'Função Erétil', icon: HeartPulse },
  { href: '/dashboard/psa', label: 'Resultados PSA', icon: ClipboardList },
  { href: '/dashboard/data-summary', label: 'Resumo de Dados', icon: BarChart3 },
  { href: '/dashboard/export', label: 'Exportar Dados', icon: Download },
  { href: '/dashboard/share', label: 'Compartilhar App', icon: Share2 },
];

interface SidebarNavContentProps {
  onLinkClick?: () => void; // Optional: For closing mobile sheet on link click
}

export default function SidebarNavContent({ onLinkClick }: SidebarNavContentProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <nav className="flex flex-col gap-2 p-4">
        {navItems.map((item) => (
          <Button
            key={item.href}
            asChild
            variant={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href)) ? 'secondary' : 'ghost'}
            className={cn(
              "w-full justify-start text-left h-11",
              (pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href)))
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
        ))}
      </nav>
      <div className="mt-auto p-4 text-center text-xs text-muted-foreground space-y-2 border-t">
        <div className="mb-2">
           <Image
            src="/logo-clinica-uroonco.png" 
            alt="Clínica Uro Onco Logo"
            width={150}
            height={45}
            className="mx-auto h-auto"
          />
        </div>
        <p className="font-semibold">Dr. Bruno Benigno</p>
        <p>CRM SP 126265 | RQE 60022</p>
        <p>Responsável Técnico</p>
        <p>
          <Link href="https://www.clinicauroonco.com.br" target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline">
            clinicauroonco.com.br
          </Link>
        </p>
         <div className="flex items-center justify-center gap-2">
            <Link href="https://api.whatsapp.com/send?phone=5511995901506" target="_blank" rel="noopener noreferrer" className="hover:text-primary inline-flex items-center gap-1 hover:underline">
              <FaWhatsapp className="h-4 w-4" />
              <span>Agendamentos</span>
            </Link>
        </div>
        <p className="pt-2">&copy; {new Date().getFullYear()} UroTrack. Todos os direitos reservados.</p>
      </div>
    </div>
  );
}
