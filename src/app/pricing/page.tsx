'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, ArrowLeft, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/contexts/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';

interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: string;
  features: string[];
  patientLimit: number;
  stripePriceId: string;
  stripePaymentLink?: string; // Link direto de pagamento do Stripe
  popular?: boolean;
}

const plans: PricingPlan[] = [
  {
    id: 'monthly',
    name: 'Plano Profissional',
    description: 'Gerencie todos os seus pacientes com eficiência',
    price: 19.90,
    currency: 'BRL',
    interval: 'mês',
    patientLimit: 100,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY || '',
    stripePaymentLink: process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_MONTHLY || 'https://buy.stripe.com/test_4gM7sL2yogQ93il4Ox97G00?client_reference_id={USER_ID}',
    popular: true,
    features: [
      'Pacientes ilimitados',
      'Acompanhamento completo',
      'Gráficos e análises avançadas',
      'Exportação de dados',
      'Compartilhamento com pacientes',
      'Suporte prioritário',
      'Cancele a qualquer momento',
    ],
  },
];

export default function PricingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user) return;
      try {
        const subscriptionRef = doc(db, 'subscription', user.uid);
        const subscriptionDoc = await getDoc(subscriptionRef);
        if (subscriptionDoc.exists()) {
          setSubscriptionStatus(subscriptionDoc.data().status || null);
        }
      } catch (error) {
        console.error('Erro ao buscar assinatura:', error);
      }
    };
    fetchSubscription();
  }, [user]);

  const hasActiveSubscription = subscriptionStatus === 'assinado' || subscriptionStatus === 'active' || subscriptionStatus === 'trialing';

  const handleSelectPlan = async (plan: PricingPlan) => {
    if (!user) {
      toast({
        title: 'Autenticação necessária',
        description: 'Faça login para assinar um plano.',
        variant: 'destructive',
      });
      router.push('/login');
      return;
    }



    setLoadingPlan(plan.id);

    try {
      // Verifica se já existe um customer_id na coleção subscription
      let existingCustomerId: string | undefined;
      
      try {
        const subscriptionRef = doc(db, 'subscription', user.uid);
        const subscriptionDoc = await getDoc(subscriptionRef);
        
        if (subscriptionDoc.exists()) {
          const data = subscriptionDoc.data();
          existingCustomerId = data.customer_id;
        }
      } catch (error) {
        console.error('Erro ao verificar customer_id existente:', error);
        // Continua mesmo se houver erro ao buscar customer_id
      }

      // Chama a Cloud Function diretamente
      const functions = getFunctions(undefined, 'us-central1');
      const createCheckout = httpsCallable(functions, 'createStripeCheckout');

      const result = await createCheckout({
        couponCode: couponCode.trim() || 'UROTRACK30', // Usa o cupom digitado ou UROTRACK3 como padrão
        customerId: existingCustomerId, // Passa o customer_id se existir
      });

      const data = result.data as { sessionId: string; url: string };
      
      if (data.url) {
        // Redireciona para o checkout do Stripe
        window.location.href = data.url;
      } else {
        throw new Error('URL de checkout não retornada');
      }
    } catch (error) {
      console.error('Erro ao criar checkout:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível iniciar o checkout. Tente novamente.',
        variant: 'destructive',
      });
      setLoadingPlan(null);
    }
  };

  // Verifica se o usuário é um médico - médicos não precisam de assinatura
  if (user?.role === 'doctor') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <div className="mb-8">
            <Button asChild className="gap-2">
              <Link href="/doctor-dashboard">
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Link>
            </Button>
          </div>

          {/* Message for Doctors */}
          <div className="text-center py-12">
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="text-3xl">Área restrita a pacientes</CardTitle>
                <CardDescription className="text-lg mt-4">
                  Esta página é exclusiva para pacientes. Como médico, você já tem acesso completo à plataforma sem necessidade de assinatura.
                </CardDescription>
              </CardHeader>
              <CardFooter className="justify-center">
                <Button asChild>
                  <Link href="/doctor-dashboard">
                    Ir para o Dashboard
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <div className="mb-8">
          <Button asChild className="gap-2">
            <Link href="/profile">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
          </Button>
        </div>

        {/* Aviso de assinatura ativa */}
        {hasActiveSubscription && (
          <Alert className="mb-8 max-w-2xl mx-auto border-amber-500 bg-amber-50">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <AlertTitle className="text-amber-800">Você já possui uma assinatura ativa</AlertTitle>
            <AlertDescription className="text-amber-700">
              Sua assinatura atual está {subscriptionStatus === 'trialing' ? 'em período de teste' : 'ativa'}. Para gerenciar sua assinatura, acesse seu{' '}
              <Link href="/profile" className="underline font-semibold hover:text-amber-900">perfil</Link>.
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Escolha o plano ideal para sua clínica
          </h1>
          <p className="text-xl text-gray-600">
            Gerencie seus pacientes com eficiência e segurança
          </p>
          
          {/* Campo de Cupom */}
          <div className="mt-8 mx-auto max-w-md">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-green-700 font-semibold">🎁 Cupom de Desconto</span>
              </div>
              <p className="text-sm text-green-600 mb-3">
                Novo usuário? Use o cupom <strong>UROTRACK30</strong> e ganhe 1 mês grátis!
              </p>
            </div>
          </div>
          

        </div>

        {/* Pricing Cards */}
        <div className="flex justify-center mb-8">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className="relative flex flex-col w-full max-w-md border-blue-500 border-2 shadow-lg"
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500">
                  Mais Popular
                </Badge>
              )}

              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="flex-1">
                <div className="mb-6">
                  <span className="text-4xl font-bold">
                    {plan.price === 0 ? 'Grátis' : `R$ ${plan.price.toFixed(2)}`}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-gray-600 ml-2">/ {plan.interval}</span>
                  )}
                </div>

                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  variant={plan.popular ? 'default' : 'outline'}
                  onClick={() => handleSelectPlan(plan)}
                  disabled={loadingPlan === plan.id || hasActiveSubscription}
                >
                  {loadingPlan === plan.id
                    ? 'Carregando...'
                    : hasActiveSubscription
                      ? 'Assinatura Ativa'
                      : 'Assinar Agora'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* FAQ or Additional Info */}
        <div className="text-center text-sm text-gray-600">
          <p>Cancele a qualquer momento, sem taxa de cancelamento.</p>
          <p>Pagamento seguro processado pelo Stripe.</p>
        </div>
      </div>
    </div>
  );
}
