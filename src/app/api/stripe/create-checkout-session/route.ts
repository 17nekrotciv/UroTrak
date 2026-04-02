import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const user = auth.currentUser;
    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { priceId, planId, couponCode, customerId } = body;

    // Chamar a Cloud Function
    const functions = getFunctions(undefined, 'us-central1');
    const createCheckout = httpsCallable(functions, 'createStripeCheckout');

    const result = await createCheckout({ 
      priceId, 
      planId,
      couponCode, // Passa o código do cupom se fornecido
      customerId, // Passa o customer_id se existir
    });
    const data = result.data as { sessionId: string; url: string };

    return NextResponse.json({
      sessionId: data.sessionId,
      url: data.url,
    });
  } catch (error: any) {
    console.error('Erro ao criar checkout session:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao criar checkout session' },
      { status: 500 }
    );
  }
}
