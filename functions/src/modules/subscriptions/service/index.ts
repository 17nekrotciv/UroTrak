import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import Stripe from "stripe";
import { UserProfile } from "../../../types/user";

// IMPORTANTE: Configure este segredo no seu projeto Firebase:
// firebase functions:secrets:set STRIPE_API_KEY
// Para emuladores, configure no .runtimeconfig.json
const stripeApiKey = process.env.STRIPE_API_KEY || functions.config().stripe.secret;
if (!stripeApiKey) {
    console.error(" Use 'firebase functions:secrets:set STRIPE_API_KEY'");
}

const stripe = new Stripe(stripeApiKey, {
    apiVersion: "2025-09-30.clover",
});

/**
 * Cria ou recupera um cliente no Stripe.
 * @param userProfile - Perfil do usuário.
 * @return O ID do cliente Stripe.
 */
async function getOrCreateStripeCustomer(userProfile: UserProfile): Promise<string> {
    // Se o usuário já tem um ID do Stripe, retorna-o.
    if (userProfile.subscription?.stripeCustomerId) {
        return userProfile.subscription.stripeCustomerId;
    }

    // Cria um novo cliente no Stripe
    const customer = await stripe.customers.create({
        email: userProfile.email,
        name: userProfile.displayName,
        metadata: { firebaseUID: userProfile.uid },
    });

    await admin.firestore().
        collection("users").doc(userProfile.uid).update({
            "subscription.stripeCustomerId": customer.id,
        });

    return customer.id;
}

/**
 * Cria uma sessão de checkout do Stripe para iniciar uma assinatura.
 * @param customerId - O ID do cliente no Stripe.
 * @param priceId - O ID do preço do plano no Stripe.
 * @param successUrl - URL de redirecionamento em caso de sucesso.
 * @param cancelUrl - URL de redirecionamento em caso de cancelamento.
 * @return O objeto da sessão de checkout.
 */
async function createCheckoutSession(customerId: string,
    priceId: string, successUrl: string, cancelUrl: string) {
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: successUrl,
        cancel_url: cancelUrl,
    });
    return session;
}

export const SubscriptionService = {
    getOrCreateStripeCustomer,
    createCheckoutSession,
};
