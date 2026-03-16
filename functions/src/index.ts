// Carregar variáveis de ambiente do arquivo .env (apenas em desenvolvimento local)
import * as dotenv from 'dotenv';
dotenv.config();

import * as admin from 'firebase-admin';

admin.initializeApp();

import { setGlobalOptions } from 'firebase-functions';
import * as functions from 'firebase-functions/v1';
import { defineSecret } from 'firebase-functions/params';
// import { onRequest } from "firebase-functions/https";
// import * as logger from "firebase-functions/logger";
import { onClinicCreateSetDoctorClaims } from './modules/users/on-create';
import {
  createPatientUser,
  completeUserRegistration,
} from './modules/users/create';
import {
  handleAsaasWebhookRequest,
  handleCreateSubscription,
} from './modules/subscriptions/controllers/subscriptionController';
import {
  handleCreateStripeCheckout,
  handleStripeWebhook,
  handleCancelStripeSubscription,
} from './modules/subscriptions/controllers/stripeController';
import { sendPatientInvite } from './modules/email/sendInvite';
import { addLogsFromN8n } from './modules/n8n/batchWrite';
import { createSignUp } from './modules/phone/register';
import { createUserFromN8n } from './modules/n8n/registerUser';

// Definir secrets da Stripe
const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');
const stripeWebhookSecret = defineSecret('STRIPE_WEBHOOK_SECRET');
//export * from "./modules/users/controllers";
// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// Configurações globais para todas as functions
setGlobalOptions({ 
  region: 'southamerica-east1',
  maxInstances: 10 
});
export { onClinicCreateSetDoctorClaims };

export { createPatientUser };

export { completeUserRegistration };

export { sendPatientInvite };

export { addLogsFromN8n };

export { createSignUp };

export { createUserFromN8n };

export const createSubscription = functions.https.onCall(
  handleCreateSubscription
);
export const handleAsaasWebhook = functions.https.onRequest(
  handleAsaasWebhookRequest
);

// Stripe functions
export const createStripeCheckout = functions
  .runWith({ secrets: [stripeSecretKey] })
  .https.onCall(handleCreateStripeCheckout);

export const cancelStripeSubscription = functions
  .runWith({ secrets: [stripeSecretKey] })
  .https.onCall(handleCancelStripeSubscription);

export const stripeWebhook = functions
  .runWith({ secrets: [stripeSecretKey, stripeWebhookSecret] })
  .https.onRequest(handleStripeWebhook);

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
