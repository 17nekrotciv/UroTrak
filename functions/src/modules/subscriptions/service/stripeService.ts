import Stripe from 'stripe';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { getFirestore } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';

const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');

let stripeInstance: Stripe | null = null;

const getStripeInstance = (): Stripe => {
  if (!stripeInstance) {
    const key = stripeSecretKey.value();
    stripeInstance = new Stripe(key, {
      apiVersion: '2025-10-29.clover',
    });
  }
  return stripeInstance;
};

// Getter para manter compatibilidade com código existente
const stripe = new Proxy({} as Stripe, {
  get: (target, prop) => {
    const instance = getStripeInstance();
    const value = (instance as any)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  }
});

const db = getFirestore('uritrak');

export interface CreateCheckoutSessionParams {
  userId: string;
  priceId: string;
  planId: string;
  successUrl: string;
  cancelUrl: string;
  couponCode?: string; // Código do cupom promocional (opcional)
}

/**
 * Cria uma sessão de checkout do Stripe
 */
export const createCheckoutSession = async (
  params: CreateCheckoutSessionParams
): Promise<Stripe.Checkout.Session> => {
  const { userId, priceId, planId, successUrl, cancelUrl, couponCode } = params;

  try {
    // Buscar dados do usuário
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new Error('Usuário não encontrado');
    }

    const userData = userDoc.data();
    const email = userData?.email;

    // Verificar ou criar customer no Stripe
    let customerId = userData?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: email,
        metadata: {
          firebaseUID: userId,
        },
      });
      customerId = customer.id;

      // Salvar o customer ID no Firestore
      await db.collection('users').doc(userId).update({
        'subscription.stripeCustomerId': customerId,
      });
    }

    // Verificar se o usuário é novo (nunca teve assinatura)
    const isNewUser = await checkIfNewUser(userId, customerId);

    // Validar cupom se fornecido
    let promotionCodeId: string | undefined;
    if (couponCode && isNewUser) {
      try {
        // Buscar o código promocional no Stripe com expand para obter o cupom
        const promotionCodes = await stripe.promotionCodes.list({
          code: couponCode,
          active: true,
          limit: 1,
          expand: ['data.coupon'],
        });

        if (promotionCodes.data.length > 0) {
          const promotionCode = promotionCodes.data[0] as any; // Usar any para contornar limitações de tipagem
          
          // Verificar se o cupom é válido (3 meses grátis)
          const coupon = promotionCode.coupon;
          if (coupon && coupon.duration === 'repeating' && coupon.duration_in_months === 3 && coupon.percent_off === 100) {
            promotionCodeId = promotionCode.id;
            functions.logger.info(`Cupom válido aplicado: ${couponCode} para usuário ${userId}`);
          } else {
            functions.logger.warn(`Cupom ${couponCode} não atende aos critérios (3 meses 100% off)`);
          }
        } else {
          functions.logger.warn(`Cupom ${couponCode} não encontrado ou inativo`);
        }
      } catch (error) {
        functions.logger.error(`Erro ao validar cupom ${couponCode}:`, error);
        // Não falha a operação, apenas registra o erro e continua sem o cupom
      }
    } else if (couponCode && !isNewUser) {
      functions.logger.warn(`Cupom ${couponCode} ignorado - usuário não é novo`);
    }

    // Preparar dados da sessão de checkout
    const sessionData: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      client_reference_id: userId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: userId,
        planId: planId,
      },
      subscription_data: {
        metadata: {
          userId: userId,
          planId: planId,
        }
      },
    };

    // Adicionar código promocional se validado
    if (promotionCodeId) {
      sessionData.discounts = [
        {
          promotion_code: promotionCodeId,
        },
      ];
    }

    // Criar sessão de checkout
    const session = await stripe.checkout.sessions.create(sessionData);

    return session;
  } catch (error) {
    functions.logger.error('Erro ao criar checkout session:', error);
    throw error;
  }
};

/**
 * Verifica se o usuário é novo (nunca teve assinatura)
 */
const checkIfNewUser = async (userId: string, customerId: string): Promise<boolean> => {
  try {
    // Verificar no Firestore se já teve assinatura
    const subscriptionDoc = await db.collection('subscription').doc(userId).get();
    if (subscriptionDoc.exists) {
      const subData = subscriptionDoc.data();
      // Se já teve alguma assinatura ativa ou cancelada, não é novo
      if (subData?.subscription_id) {
        functions.logger.info(`Usuário ${userId} já teve assinatura anterior`);
        return false;
      }
    }

    // Verificar no Stripe se já teve assinaturas
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
    });

    if (subscriptions.data.length > 0) {
      functions.logger.info(`Usuário ${userId} já teve assinatura no Stripe`);
      return false;
    }

    functions.logger.info(`Usuário ${userId} é novo - elegível para cupom`);
    return true;
  } catch (error) {
    functions.logger.error('Erro ao verificar se usuário é novo:', error);
    // Em caso de erro, assume que não é novo por segurança
    return false;
  }
};

/**
 * Atualiza o status da assinatura do usuário no Firestore
 */
export const updateSubscriptionStatus = async (
  subscriptionId: string,
  status: string
): Promise<void> => {
  try {
    // Buscar a subscription no Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const userId = subscription.metadata.userId;
    const planId = subscription.metadata.planId;

    if (!userId) {
      functions.logger.error('userId não encontrado nos metadados da subscription');
      return;
    }

    // Mapear status do Stripe para nosso status
    const statusMap: { [key: string]: string } = {
      active: 'active',
      trialing: 'trialing',
      past_due: 'past_due',
      canceled: 'canceled',
      unpaid: 'canceled',
      incomplete: 'past_due',
      incomplete_expired: 'canceled',
    };

    const mappedStatus = statusMap[status] || 'canceled';

    // Determinar o limite de pacientes baseado no plano
    const patientLimitMap: { [key: string]: number } = {
      free: 10,
      monthly: 100,
      quarterly: 100,
    };

    const patientLimit = patientLimitMap[planId] || 10;

    // Atualizar o Firestore - coleção users
    await db.collection('users').doc(userId).update({
      'subscription.status': mappedStatus,
      'subscription.plan': planId,
      'subscription.subscriptionId': subscriptionId,
      'subscription.patientLimit': patientLimit,
      'subscription.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
    });

    // Atualizar também a coleção subscription se existir
    const subscriptionDoc = await db.collection('subscription').doc(userId).get();
    if (subscriptionDoc.exists) {
      await db.collection('subscription').doc(userId).update({
        status: mappedStatus,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    functions.logger.info(
      `Assinatura atualizada para o usuário ${userId}: ${mappedStatus}`
    );
  } catch (error) {
    functions.logger.error('Erro ao atualizar status da assinatura:', error);
    throw error;
  }
};

/**
 * Cancela uma assinatura no Stripe
 */
export const cancelSubscription = async (
  subscriptionId: string
): Promise<void> => {
  try {
    await stripe.subscriptions.cancel(subscriptionId);
    await updateSubscriptionStatus(subscriptionId, 'canceled');
    functions.logger.info(`Assinatura ${subscriptionId} cancelada`);
  } catch (error) {
    functions.logger.error('Erro ao cancelar assinatura:', error);
    throw error;
  }
};

/**
 * Retorna as informações da assinatura do Stripe
 */
export const getSubscription = async (
  subscriptionId: string
): Promise<Stripe.Subscription> => {
  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch (error) {
    functions.logger.error('Erro ao buscar assinatura:', error);
    throw error;
  }
};

/**
 * Cria um registro de assinatura na coleção 'subscriptions' do Firestore
 */
export const createSubscriptionRecord = async (
  checkoutSession: any
): Promise<void> => {
  try {
    const userId = checkoutSession.client_reference_id || checkoutSession.metadata?.userId;
    const customerId = checkoutSession.customer;
    const subscriptionId = checkoutSession.subscription;

    if (!userId) {
      functions.logger.error('userId não encontrado na checkout session');
      return;
    }

    // Buscar a subscription do Stripe para obter mais detalhes
    let subscription;
    if (subscriptionId) {
      subscription = await stripe.subscriptions.retrieve(subscriptionId as string);
    }

    // Buscar informações de pagamento
    const paymentIntent = checkoutSession.payment_intent 
      ? await stripe.paymentIntents.retrieve(checkoutSession.payment_intent as string)
      : null;

    // Criar documento na coleção subscriptions
    const subscriptionData = {
      amount: checkoutSession.amount_total / 100, // Converter de centavos para reais
      currency: checkoutSession.currency?.toUpperCase() || 'BRL',
      payment_method: paymentIntent?.payment_method_types?.[0] || checkoutSession.payment_method_types?.[0] || 'card',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      user: userId,
      customer_id: customerId,
      status: subscription?.status || 'active',
      subscription_id: subscriptionId || null,
      plan_id: subscription?.items?.data?.[0]?.price?.id || null,
      session_id: checkoutSession.id,
    };

    // Usar o userId como ID do documento na coleção subscriptions
    await db.collection('subscription').doc(userId).set(subscriptionData);

    functions.logger.info(
      `Registro de assinatura criado para o usuário ${userId}`
    );
  } catch (error) {
    functions.logger.error('Erro ao criar registro de assinatura:', error);
    throw error;
  }
};

export { stripe };
