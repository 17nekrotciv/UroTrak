// src/components/layout/SidebarNavContent.tsx
"use client";

import React from 'react';
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
  FileText,
  BarChart3,
} from 'lucide-react';

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
      <div className="mt-auto pt-4 text-center text-xs text-muted-foreground">
        <p className="font-semibold">Clínica Uro Onco & Dr. Bruno Benigno</p>
        <p>&copy; {new Date().getFullYear()} UroTrack. Todos os direitos reservados.</p>
      </div>
    </nav>
  );
}
