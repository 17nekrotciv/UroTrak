// src/components/layout/AppHeader.tsx
"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-provider';
import { LogOut, UserCircle, Menu } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useData } from '@/contexts/data-provider';
import { usePathname } from 'next/navigation';

interface AppHeaderProps {
  onMenuClick?: () => void; // For mobile sidebar toggle
}

export default function AppHeader({ onMenuClick }: AppHeaderProps) {
  const { user, logout } = useAuth();
  const { userProfile } = useData();
  const pathname = usePathname();

  const dashboardPath = userProfile?.role === 'doctor' ? '/doctor-dashboard' : '/dashboard';

  const hideMenuButton = userProfile?.role === 'doctor' && pathname === '/doctor-dashboard';

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`;
    }
    return name.substring(0, 2);
  };

  // --- MODIFICAÇÃO AQUI ---
  // Define a fonte do logo dinamicamente.
  // Usa o logo da clínica (se o usuário for um médico e tiver um), senão, usa o logo padrão.
  const logoSrc = userProfile?.clinic?.logoUrl || "https://static.wixstatic.com/media/5c67c0_f5b3f54cdd584c12b1e2207e44cfd15b~mv2.png";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 px-4 shadow-sm backdrop-blur-md sm:px-6">
      {/* Left items: Mobile Menu Button and Logo */}
      <div className="flex items-center gap-2 sm:gap-4">
        {!hideMenuButton && (
          <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
            <Menu className="h-6 w-6" />
            <span className="sr-only">Abrir menu</span>
          </Button>
        )}
        <Link href={dashboardPath} className="flex items-center">
          <Image
            src={logoSrc}
            alt="Logo da Clínica"
            width={72}
            height={36}
            className="object-contain"
            priority
          />
        </Link>
      </div>

      {/* Centered App Name */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <span className="font-headline text-xl font-bold text-foreground hidden sm:inline">Uro Track</span>
      </div>

      {/* Right item: User Dropdown */}
      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarImage src={userProfile?.photoURL || undefined} alt={userProfile?.displayName || 'Avatar do usuário'} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials(user.displayName)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.displayName || 'Usuário'}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/profile">
                <UserCircle className="mr-2 h-4 w-4" />
                <span>Perfil</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {!user && <div className="w-9 h-9"></div>}
    </header>
  );
}