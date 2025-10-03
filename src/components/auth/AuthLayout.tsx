// src/components/auth/AuthLayout.tsx
import React, { type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FaWhatsapp } from 'react-icons/fa';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
}

export default function AuthLayout({ children, title }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-accent/30 p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          {/* O BLOCO DO LOGO QUE ESTAVA AQUI FOI REMOVIDO */}
          <h2 className="font-headline text-4xl font-bold text-primary">{title}</h2>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-xl sm:p-8">
          {children}
        </div>

        <div className="mt-8 text-center text-xs text-muted-foreground space-y-1">
          <p className="pt-2">
            Todos os direitos reservados são de propriedade da Clínica Uro Onco.
            <br />
            Desenvolvido pela equipe de tecnologia em conjunto com Dr. Bruno Benigno.
          </p>
        </div>
      </div>
    </div>
  );
}