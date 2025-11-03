/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
import * as admin from "firebase-admin";


admin.initializeApp();


import { setGlobalOptions } from "firebase-functions";
import * as functions from "firebase-functions/v1";
// import { onRequest } from "firebase-functions/https";
// import * as logger from "firebase-functions/logger";
import { onClinicCreateSetDoctorClaims } from "./modules/users/on-create";
import { createPatientUser, completeUserRegistration } from "./modules/users/create"
import { handleAsaasWebhookRequest, handleCreateSubscription } from "./modules/subscriptions/controllers/subscriptionController";
import { sendPatientInvite } from "./modules/email/sendInvite";
//export * from "./modules/users/controllers";
// Start writing functions
// https://firebase.google.com/docs/functions/typescript

setGlobalOptions({ region: "southamerica-east1" });


// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
export { onClinicCreateSetDoctorClaims };

export { createPatientUser }

export { completeUserRegistration }

export { sendPatientInvite }

export const createSubscription = functions.https.onCall(handleCreateSubscription);
export const handleAsaasWebhook = functions.https.onRequest(handleAsaasWebhookRequest);

setGlobalOptions({ maxInstances: 10 });

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
