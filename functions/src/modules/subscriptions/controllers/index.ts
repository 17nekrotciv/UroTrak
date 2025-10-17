import * as functions from "firebase-functions";
import Stripe from "stripe";
import * as admin from "firebase-admin";
import { UserService } from "../../users/service";
import { SubscriptionService } from "../service";

// IMPORTANTE: Configure o segredo do endpoint do webhook:
// firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET ||
    functions.config().stripe.webhook_secret;

export const createStripeCheckout = functions.https.onCall(async (request) => {
    if (!request.auth) {
        throw new functions.https.HttpsError("unauthenticated",
            "A requisição precisa ser autenticada.");
    }

    const { priceId, successUrl, cancelUrl } = request.data;
    if (!priceId || !successUrl || !cancelUrl) {
        throw new functions.https.HttpsError("invalid-argument",
            "priceId, successUrl e cancelUrl são obrigatórios.");
    }

    try {
        const userProfile = await UserService.getProfile(request.auth.uid);
        if (!userProfile) {
            throw new functions.https.HttpsError("not-found",
                "Utilizador não encontrado.");
        }

        const customerId = await SubscriptionService
            .getOrCreateStripeCustomer(userProfile);
        const session = await SubscriptionService
            .createCheckoutSession(customerId, priceId, successUrl, cancelUrl);

        return { sessionId: session.id };
    } catch (error: any) {
        console.error("Erro no controller createStripeCheckout:", error);
        throw new functions.https.HttpsError("internal", error.message ||
            "Não foi possível criar a sessão de checkout.");
    }
});


export const stripeWebhook = functions.https.onRequest(async (req, res) => {
    const stripe = new Stripe(process.env.STRIPE_API_KEY ||
        functions.config().stripe.secret, { apiVersion: "2025-09-30.clover" });
    const sig = req.headers["stripe-signature"] as string;

    let event: Stripe.Event;

    try {
        if (!stripeWebhookSecret) {
            throw new
                Error("A chave secreta do webhook do Stripe não está configurada.");
        }
        event = stripe.webhooks.constructEvent(req.rawBody, sig, stripeWebhookSecret);
    } catch (err: any) {
        console.error("❌ Erro na assinatura do webhook:", err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }

    // Lida com os eventos de assinatura
    if (event.type.startsWith("customer.subscription.")) {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        try {
            const customer =
                await stripe.customers.retrieve(customerId) as Stripe.Customer;
            const uid = customer.metadata.firebaseUID;

            if (!uid) {
                console.error
                    ("UID do Firebase não encontrado nos metadados do cliente Stripe:",
                        customerId);
                res.status(400).send("UID não encontrado.");
                return;
            }

            const status = subscription.status;
            const planId = subscription.items.data[0].price.id;

            let patientLimit = 5; // Padrão (plano gratuito)
            if (planId === "price_123_plano_pro") patientLimit = 50;
            if (planId === "price_456_plano_enterprise") patientLimit = 500;

            await admin.firestore().collection("users").doc(uid).update({
                "subscription.status": status,
                "subscription.planId": planId,
                "subscription.subscriptionId": subscription.id,
                "subscription.patientLimit": patientLimit,
            });

            console.log
                (`Assinatura atualizada para o usuário ${uid}: status ${status}`);
        } catch (error: any) {
            console.error
                ("Erro ao processar o webhook de assinatura:", error.message);
            res.status(500).send("Erro interno ao processar o webhook.");
            return;
        }
    }

    res.status(200).send({ received: true });
});
