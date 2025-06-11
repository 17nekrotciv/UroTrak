// src/components/layout/AppHeader.tsx
"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image'; // Import next/image
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-provider';
import { LogOut, UserCircle, Menu } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AppHeaderProps {
  onMenuClick?: () => void; // For mobile sidebar toggle
}

export default function AppHeader({ onMenuClick }: AppHeaderProps) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 px-4 shadow-sm backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-2 sm:gap-4">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
          <Menu className="h-6 w-6" />
          <span className="sr-only">Abrir menu</span>
        </Button>
        <Link href="/dashboard" className="flex items-center">
          <Image 
            src="https://static.wixstatic.com/media/5c67c0_f5b3f54cdd584c12b1e2207e44cfd15b~mv2.png" 
            alt="Uro Track - Clínica Uro Onco Logo" 
            width={72} // Adjusted for header height
            height={36} // Adjusted for header height
            className="object-contain"
            priority // Preload logo as it's LCP candidate
          />
        </Link>
      </div>

      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <UserCircle className="h-7 w-7 text-primary" />
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
            <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  );
}
