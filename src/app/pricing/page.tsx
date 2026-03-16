'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
    id: 'free',
    name: 'Gratuito',
    description: 'Ideal para começar',
    price: 0,
    currency: 'BRL',
    interval: 'mês',
    patientLimit: 10,
    stripePriceId: '', // No Stripe price needed for free plan
    features: [
      'Até 10 pacientes',
      'Acompanhamento básico',
      'Gráficos de dados',
      'Suporte por email',
    ],
  },
  {
    id: 'monthly',
    name: 'Mensal',
    description: 'Plano de assinatura mensal',
    price: 10.00,
    currency: 'BRL',
    interval: 'mês',
    patientLimit: 100,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY || '',
    stripePaymentLink: process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_MONTHLY || 'https://buy.stripe.com/test_4gM7sL2yogQ93il4Ox97G00?client_reference_id={USER_ID}',
    popular: true,
    features: [
      'Até 100 pacientes',
      'Todos os recursos do plano gratuito',
      'Exportação de dados',
      'Compartilhamento com pacientes',
      'Análises avançadas',
      'Suporte prioritário',
      'Cancele a qualquer momento',
    ],
  },
  {
    id: 'quarterly',
    name: 'Trimestral',
    description: 'Economize com o plano trimestral',
    price: 25.00,
    currency: 'BRL',
    interval: '3 meses',
    patientLimit: 100,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_QUARTERLY || '',
    features: [
      'Até 100 pacientes',
      'Todos os recursos do plano gratuito',
      'Exportação de dados',
      'Compartilhamento com pacientes',
      'Análises avançadas',
      'Suporte prioritário',
      'Economize 16% vs plano mensal',
      'Renovação automática a cada 3 meses',
    ],
  },
];

export default function PricingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [couponCode, setCouponCode] = useState('');

  // Função para verificar se há uma nova assinatura
  const checkForNewSubscription = async (lastCheckTime: number) => {
    if (!user?.uid) return false;

    try {
      const subscriptionRef = doc(db, 'subscription', user.uid);
      const docSnap = await getDoc(subscriptionRef);
      
      if (docSnap.exists()) {
        const subscriptionData = docSnap.data();
        const createdAt = subscriptionData.created_at?.toMillis() || 0;
        
        // Se a assinatura foi criada após o tempo da última verificação
        if (createdAt > lastCheckTime) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Erro ao verificar assinatura:', error);
      return false;
    }
  };

  // Polling para verificar se o pagamento foi completado
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let timeoutId: NodeJS.Timeout;

    if (checkingPayment) {
      const checkTime = Date.now();
      
      toast({
        title: 'Aguardando pagamento',
        description: 'Complete o pagamento na janela do Stripe. Esta página será atualizada automaticamente.',
        duration: 10000,
      });

      intervalId = setInterval(async () => {
        const hasNewSubscription = await checkForNewSubscription(checkTime);
        
        if (hasNewSubscription) {
          setCheckingPayment(false);
          toast({
            title: '✅ Pagamento confirmado!',
            description: 'Sua assinatura foi ativada com sucesso. Redirecionando...',
          });
          
          // Aguarda 2 segundos e redireciona para o dashboard
          setTimeout(() => {
            router.push('/dashboard/success?payment=completed');
            router.refresh();
          }, 2000);
        }
      }, 3000); // Verifica a cada 3 segundos

      // Timeout de 15 minutos
      timeoutId = setTimeout(() => {
        setCheckingPayment(false);
        toast({
          title: 'Tempo esgotado',
          description: 'Não detectamos o pagamento. Se você completou o pagamento, verifique seu histórico de assinaturas.',
          variant: 'destructive',
        });
      }, 15 * 60 * 1000); // 15 minutos
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [checkingPayment, user, toast, router]);

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

    if (plan.id === 'free') {
      toast({
        title: 'Plano gratuito',
        description: 'Você já está no plano gratuito.',
      });
      return;
    }

    setLoadingPlan(plan.id);

    try {
      // Se o plano tem um link direto de pagamento do Stripe, usa ele
      if (plan.stripePaymentLink) {
        const paymentUrl = plan.stripePaymentLink.replace('{USER_ID}', user.uid);
        
        // Abre em nova aba
        window.open(paymentUrl, '_blank');
        
        // Inicia o polling para verificar o pagamento
        setCheckingPayment(true);
        setLoadingPlan(null);
        return;
      }

      // Caso contrário, usa a API para criar checkout session
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: plan.stripePriceId,
          planId: plan.id,
          couponCode: couponCode.trim() || undefined, // Passa o cupom se fornecido
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao criar sessão de checkout');
      }

      const { url } = await response.json();
      
      if (url) {
        // Abre em nova aba
        window.open(url, '_blank');
        
        // Inicia o polling para verificar o pagamento
        setCheckingPayment(true);
        setLoadingPlan(null);
      }
    } catch (error) {
      console.error('Erro ao criar checkout:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível iniciar o checkout. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoadingPlan(null);
    }
  };

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
                Novo usuário? Use o cupom <strong>WELCOME3M</strong> e ganhe 3 meses grátis!
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Digite seu cupom"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="flex-1 px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  disabled={checkingPayment || loadingPlan !== null}
                />
                {couponCode && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCouponCode('')}
                    className="text-green-700 border-green-300 hover:bg-green-100"
                  >
                    Limpar
                  </Button>
                )}
              </div>
              {couponCode && (
                <p className="text-xs text-green-600 mt-2">
                  ✓ Cupom será validado no checkout
                </p>
              )}
            </div>
          </div>
          
          {/* Indicador de aguardando pagamento */}
          {checkingPayment && (
            <div className="mt-6 mx-auto max-w-md">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  <div className="text-left flex-1">
                    <p className="font-semibold text-blue-900">Aguardando confirmação de pagamento</p>
                    <p className="text-sm text-blue-700">Complete o pagamento na janela do Stripe</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCheckingPayment(false)}
                  className="w-full text-blue-700 border-blue-300 hover:bg-blue-100"
                >
                  Cancelar verificação
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative flex flex-col ${
                plan.popular ? 'border-blue-500 border-2 shadow-lg' : ''
              }`}
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
                  disabled={loadingPlan === plan.id || checkingPayment}
                >
                  {loadingPlan === plan.id
                    ? 'Carregando...'
                    : checkingPayment
                    ? '⏳ Aguardando pagamento...'
                    : plan.id === 'free'
                    ? 'Plano Atual'
                    : 'Escolher Plano'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* FAQ or Additional Info */}
        <div className="text-center text-sm text-gray-600">
          <p>Todos os planos incluem 14 dias de teste gratuito.</p>
          <p>Cancele a qualquer momento, sem taxa de cancelamento.</p>
        </div>
      </div>
    </div>
  );
}
