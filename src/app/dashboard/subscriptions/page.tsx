'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, Clock, XCircle, CreditCard, Sparkles } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import Link from 'next/link';

interface Subscription {
  id: string;
  amount: number;
  currency: string;
  payment_method: string;
  created_at: any;
  user: string;
  customer_id: string;
  status: string;
  subscription_id?: string;
  plan_id?: string;
}

export default function SubscriptionsHistoryPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user?.uid) return;

      try {
        const subscriptionRef = doc(db, 'subscription', user.uid);
        const docSnap = await getDoc(subscriptionRef);

        if (docSnap.exists()) {
          const subscriptionData = { id: docSnap.id, ...docSnap.data() } as Subscription;
          console.log('Dados da assinatura:', subscriptionData);
          setSubscription(subscriptionData);
        } else {
          setSubscription(null);
        }
      } catch (error) {
        console.error('Erro ao buscar assinatura:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [user]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'Ativa', variant: 'default' as const, icon: CheckCircle2 },
      assinado: { label: 'Ativa', variant: 'default' as const, icon: CheckCircle2 },
      trialing: { label: 'Período Trial', variant: 'secondary' as const, icon: Clock },
      past_due: { label: 'Pagamento Pendente', variant: 'destructive' as const, icon: XCircle },
      canceled: { label: 'Cancelada', variant: 'outline' as const, icon: XCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency || 'BRL',
    }).format(amount);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(date, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
  };

  const handleCancelSubscription = async () => {
    console.log('=== Iniciando cancelamento ===');
    console.log('Usuário autenticado:', user);
    
    // Tentar obter o subscription_id do documento users
    let subscriptionId: string | null = null;
    let customerId: string | null = subscription?.customer_id || null;
    
    if (user?.uid) {
      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          subscriptionId = userData?.subscription?.subscriptionId || null;
          console.log('subscriptionId do users:', subscriptionId);
        }
      } catch (error) {
        console.error('Erro ao buscar dados do usuário:', error);
      }
    }
    
    console.log('Parâmetros para cancelamento:', { subscriptionId, customerId });
    
    // Se não tiver nem subscriptionId nem customerId, não pode cancelar
    if (!subscriptionId && !customerId) {
      console.error('Dados da assinatura:', subscription);
      toast({
        title: 'Erro',
        description: 'Informações da assinatura não encontradas. Entre em contato com o suporte.',
        variant: 'destructive',
      });
      return;
    }

    setCanceling(true);
    try {
      // Chamar a Cloud Function diretamente com a região correta
      const functions = getFunctions(undefined, 'us-central1');
      const cancelStripeSubscription = httpsCallable(functions, 'cancelStripeSubscription');
      
      console.log('Chamando Cloud Function...');
      const result = await cancelStripeSubscription({ 
        subscriptionId,
        customerId 
      });
      console.log('Resultado da Cloud Function:', result);

      const data = result.data as { success: boolean; message: string };

      if (data.success) {
        toast({
          title: 'Assinatura Cancelada',
          description: 'Sua assinatura foi cancelada com sucesso.',
        });
        setShowCancelDialog(false);
        
        // Recarregar a página para atualizar os dados
        setTimeout(() => {
          router.refresh();
          window.location.reload();
        }, 1000);
      } else {
        throw new Error(data.message || 'Erro ao cancelar assinatura');
      }
    } catch (error: any) {
      console.error('Erro ao cancelar:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao cancelar assinatura',
        variant: 'destructive',
      });
    } finally {
      setCanceling(false);
    }
  };

  if (loading) {
    return (
      <>
        <PageHeader title="Histórico de Assinaturas" icon={CreditCard} />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Minha Assinatura" icon={CreditCard} />
      
      {!subscription ? (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Você ainda não possui uma assinatura ativa.
            </p>
            <Button asChild>
              <Link href="/pricing">
                <Sparkles className="mr-2 h-4 w-4" />
                Ver Planos Disponíveis
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Detalhes da Assinatura</CardTitle>
              {getStatusBadge(subscription.status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-6">
              <div>
                <p className="text-muted-foreground mb-1">Valor</p>
                <p className="font-medium text-lg">
                  {formatCurrency(subscription.amount, subscription.currency)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Data de Assinatura</p>
                <p className="font-medium">{formatDate(subscription.created_at)}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Método de Pagamento</p>
                <p className="font-medium capitalize">{subscription.payment_method}</p>
              </div>
              {subscription.subscription_id && (
                <div className="md:col-span-3">
                  <p className="text-muted-foreground mb-1">ID da Assinatura</p>
                  <p className="font-mono text-xs truncate">{subscription.subscription_id}</p>
                </div>
              )}
              {subscription.customer_id && (
                <div className="md:col-span-3">
                  <p className="text-muted-foreground mb-1">ID do Cliente</p>
                  <p className="font-mono text-xs truncate">{subscription.customer_id}</p>
                </div>
              )}
            </div>
            {subscription.status !== 'canceled' && (
              <div className="pt-4 border-t">
                <Button
                  variant="destructive"
                  onClick={() => setShowCancelDialog(true)}
                  className="w-full sm:w-auto"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancelar Assinatura
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Assinatura</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar sua assinatura? Esta ação não pode ser desfeita.
              Você perderá acesso aos recursos premium ao final do período de cobrança atual.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={canceling}>Não, manter assinatura</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              disabled={canceling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {canceling ? 'Cancelando...' : 'Sim, cancelar assinatura'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
