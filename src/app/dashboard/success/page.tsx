// src/app/dashboard/success/page.tsx
"use client";

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageHeader from '@/components/ui/PageHeader';
import { CheckCircle2, Home } from 'lucide-react';

export default function SuccessPage() {
  return (
    <>
      <PageHeader 
        title="Operação Concluída" 
        icon={CheckCircle2} 
      />
      <div className="flex flex-col items-center justify-center text-center">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="font-headline text-2xl text-primary">
              Excelente!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-lg text-foreground">
              Seus dados foram adicionados à nossa plataforma.
            </p>
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/dashboard">
                <Home className="mr-2 h-5 w-5" />
                Voltar ao Painel Geral
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
