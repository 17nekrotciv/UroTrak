// src/components/auth/AuthLayout.tsx
import React, { type ReactNode } from 'react';
import Image from 'next/image'; // Using next/image for optimized images

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
}

export default function AuthLayout({ children, title }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-accent/30 p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          {/* Replace with an actual logo if available */}
          {/* <Image src="/logo-urotrack.png" alt="UroTrack Logo" width={120} height={120} className="mx-auto mb-4" data-ai-hint="medical logo" /> */}
          <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 lucide lucide-shield-plus"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="M8 11h8"/><path d="M12 7v8"/></svg>
          <h1 className="font-headline text-4xl font-bold text-primary">{title}</h1>
          <p className="mt-2 text-muted-foreground">Bem-vindo ao UroTrack</p>
        </div>
        
        <div className="rounded-xl border bg-card p-6 shadow-xl sm:p-8">
          {children}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Todos os direitos reservados são de propriedade da Clínica Uro Onco.
          <br />
          Desenvolvido pela equipe de tecnologia em conjunto com Dr. Bruno Benigno.
        </p>
      </div>
    </div>
  );
}
