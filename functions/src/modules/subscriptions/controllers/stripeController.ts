import * as functions from 'firebase-functions';
import * as functionsV1 from 'firebase-functions/v1';
import { getFirestore } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import {
  createCheckoutSession,
  updateSubscriptionStatus,
  createSubscriptionRecord,
  cancelSubscription,
  stripe,
} from '../service/stripeService';

const stripeWebhookSecret = defineSecret('STRIPE_WEBHOOK_SECRET');

/**
 * Função callable para criar uma sessão de checkout do Stripe
 */
export const handleCreateStripeCheckout = async (
  data: any,
  context: functionsV1.https.CallableContext
) => {
  // Validação de autenticação
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Você precisa estar logado para criar uma assinatura.'
    );
  }

  const { uid } = context.auth;
  const { priceId, planId, couponCode } = data;

  // Validação de dados
  if (!priceId || !planId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'priceId e planId são obrigatórios.'
    );
  }

  try {
    // Definir URLs de sucesso e cancelamento
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    const successUrl = `${baseUrl}/perfil`;
    const cancelUrl = `${baseUrl}/pricing`;

    // Criar sessão de checkout
    const session = await createCheckoutSession({
      userId: uid,
      priceId,
      planId,
      successUrl,
      cancelUrl,
      couponCode, // Passa o código do cupom
    });

    return {
      sessionId: session.id,
      url: session.url,
    };
  } catch (error) {
    functions.logger.error('Erro ao criar checkout do Stripe:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Erro ao criar sessão de checkout.'
    );
  }
};

/**
 * Webhook do Stripe para processar eventos
 */
export const handleStripeWebhook = async (
  request: functionsV1.https.Request,
  response: functionsV1.Response
) => {
  const sig = request.headers['stripe-signature'];
  const webhookSecret = stripeWebhookSecret.value();

  if (!sig || !webhookSecret) {
    functions.logger.error('Webhook signature ou secret não encontrado');
    response.status(400).send('Webhook Error: Missing signature or secret');
    return;
  }

  let event;

  try {
    // Verificar a assinatura do webhook
    event = stripe.webhooks.constructEvent(
      request.rawBody,
      sig,
      webhookSecret
    );
  } catch (err: any) {
    functions.logger.error('Erro de verificação do webhook:', err.message);
    response.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Processar diferentes tipos de eventos
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        functions.logger.info('Checkout session completed:', session.id);

        // Criar registro da assinatura na coleção 'subscriptions'
        await createSubscriptionRecord(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        functions.logger.info(
          `Subscription ${event.type}:`,
          subscription.id,
          subscription.status
        );

        await updateSubscriptionStatus(subscription.id, subscription.status);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        functions.logger.info('Subscription deleted:', subscription.id);

        await updateSubscriptionStatus(subscription.id, 'canceled');
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any;
        functions.logger.info('Invoice payment succeeded:', invoice.id);

        // Atualizar status se necessário
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          );
          await updateSubscriptionStatus(subscription.id, subscription.status);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        functions.logger.warn('Invoice payment failed:', invoice.id);

        // Atualizar status para past_due
        if (invoice.subscription) {
          await updateSubscriptionStatus(
            invoice.subscription as string,
            'past_due'
          );
        }
        break;
      }

      default:
        functions.logger.info('Evento não tratado:', event.type);
    }

    response.status(200).json({ received: true });
  } catch (error) {
    functions.logger.error('Erro ao processar webhook do Stripe:', error);
    response.status(500).send('Webhook processing error');
  }
};

/**
 * Função callable para cancelar uma assinatura do Stripe
 */
export const handleCancelStripeSubscription = async (
  data: any,
  context: functionsV1.https.CallableContext
) => {
  
  // Validação de autenticação
  if (!context.auth) {
    functions.logger.error('Usuário não autenticado');
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Você precisa estar logado para cancelar uma assinatura.'
    );
  }

  const { uid } = context.auth;
  let { subscriptionId, customerId } = data;
  
  functions.logger.info(`UID do usuário: ${uid}`);

  try {
    // Se não tiver subscriptionId, tentar buscar usando customerId
    if (!subscriptionId && customerId) {
      functions.logger.info(`Buscando assinaturas para customer: ${customerId}`);
      
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 1,
      });

      if (subscriptions.data.length === 0) {
        // Tentar buscar assinaturas trialing também
        const trialingSubscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: 'trialing',
          limit: 1,
        });

        if (trialingSubscriptions.data.length > 0) {
          subscriptionId = trialingSubscriptions.data[0].id;
        } else {
          throw new functions.https.HttpsError(
            'not-found',
            'Nenhuma assinatura ativa encontrada para este customer.'
          );
        }
      } else {
        subscriptionId = subscriptions.data[0].id;
      }

      functions.logger.info(`Subscription encontrada: ${subscriptionId}`);
    }

    // Validação de dados
    if (!subscriptionId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'subscriptionId ou customerId são obrigatórios.'
      );
    }

    // Buscar a assinatura para verificar se pertence ao usuário
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    functions.logger.info(`Subscription metadata:`, subscription.metadata);
    functions.logger.info(`User ID from context:`, uid);
    
    // Validar se a assinatura pertence ao usuário
    // Verificar metadata.userId ou buscar o customer no Firestore
    if (subscription.metadata.userId && subscription.metadata.userId !== uid) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Você não tem permissão para cancelar esta assinatura.'
      );
    }
    
    // Se não tiver userId na metadata, validar pelo customerId no Firestore
    if (!subscription.metadata.userId) {
      functions.logger.info('Metadata não tem userId, buscando no Firestore...');
      const db = getFirestore('uritrak');
      const subscriptionDoc = await db.collection('subscription').doc(uid).get();
      
      functions.logger.info(`Subscription doc exists: ${subscriptionDoc.exists}`);
      if (subscriptionDoc.exists) {
        functions.logger.info(`Subscription data:`, subscriptionDoc.data());
      }
      
      if (!subscriptionDoc.exists || subscriptionDoc.data()?.customer_id !== subscription.customer) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'Você não tem permissão para cancelar esta assinatura.'
        );
      }
      
      functions.logger.info('Validação por Firestore passou!');
    }

    // Cancelar a assinatura
    await cancelSubscription(subscriptionId);

    // Deletar o documento da coleção subscription
    const db = getFirestore('uritrak');
    await db.collection('subscription').doc(uid).delete();
    
    functions.logger.info(`Documento de subscription deletado do Firestore para o userId: ${uid}`);

    return {
      success: true,
      message: 'Assinatura cancelada com sucesso.',
    };
  } catch (error: any) {
    functions.logger.error('Erro ao cancelar assinatura do Stripe:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      'internal',
      'Erro ao cancelar assinatura.'
    );
  }
};
