// src/components/auth/AuthLayout.tsx
import React, { type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
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
          <Image
            src="/logo-clinica-uroonco.png"
            alt="UroTrack - Clínica Uro Onco Logo"
            width={200}
            height={60}
            className="mx-auto mb-4"
            priority
          />
          <h1 className="font-headline text-4xl font-bold text-primary">{title}</h1>
          <p className="mt-2 text-muted-foreground">Bem-vindo ao UroTrack</p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-xl sm:p-8">
          {children}
        </div>

        <div className="mt-8 text-center text-xs text-muted-foreground space-y-1">
          <p>
            Dr. Bruno Benigno | CRM SP 126265 | RQE 60022 | Responsável Técnico
          </p>
          <p>
            <Link href="https://www.clinicauroonco.com.br" target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline">
              www.clinicauroonco.com.br
            </Link>
          </p>
          <div className="flex items-center justify-center gap-2">
            <Link href="https://api.whatsapp.com/send?phone=5511995901506" target="_blank" rel="noopener noreferrer" className="hover:text-primary inline-flex items-center gap-1 hover:underline">
              <FaWhatsapp className="h-4 w-4" />
              <span>Contato via WhatsApp</span>
            </Link>
          </div>
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
