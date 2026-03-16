// src/app/dashboard/success/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageHeader from '@/components/ui/PageHeader';
import { CheckCircle2, User, Sparkles } from 'lucide-react';

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');
  const [isSubscription, setIsSubscription] = useState(false);
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    // Se tiver session_id, é uma assinatura do Stripe
    if (sessionId) {
      setIsSubscription(true);
    }
  }, [sessionId]);

  useEffect(() => {
    // Redirecionar automaticamente para o perfil após 3 segundos se for assinatura
    if (isSubscription) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            router.push('/profile');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isSubscription, router]);

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
              {isSubscription ? (
                <Sparkles className="h-10 w-10 text-primary" />
              ) : (
                <CheckCircle2 className="h-10 w-10 text-primary" />
              )}
            </div>
            <CardTitle className="font-headline text-2xl text-primary">
              {isSubscription ? 'Assinatura Ativada!' : 'Excelente!'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-lg text-foreground">
              {isSubscription 
                ? 'Sua assinatura foi ativada com sucesso! Você agora tem acesso a todos os recursos do seu plano.'
                : 'Seus dados foram adicionados à nossa plataforma.'}
            </p>
            {isSubscription && (
              <>
                <p className="text-sm text-muted-foreground">
                  Aproveite os 14 dias de teste gratuito para explorar todas as funcionalidades.
                </p>
                <p className="text-sm text-muted-foreground">
                  Redirecionando para o perfil em {countdown} segundo{countdown !== 1 ? 's' : ''}...
                </p>
              </>
            )}
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href={isSubscription ? "/profile" : "/dashboard"}>
                <User className="mr-2 h-5 w-5" />
                {isSubscription ? 'Ir para Perfil' : 'Voltar ao Painel Geral'}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
