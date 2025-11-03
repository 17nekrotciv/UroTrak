import * as functions from "firebase-functions";
import * as functionsV1 from "firebase-functions/v1"
import * as admin from "firebase-admin";
import { UserProfile } from "../../../types/user";
import { createAsaasSubscription, findOrCreateAsaasCustomer, updateUserSubscriptionStatus } from "../service/asaasService";

const db = admin.firestore();
const ASAAS_WEBHOOK_TOKEN = process.env.ASAAS_WEBHOOK_TOKEN // Pega o token do webhook

/**
 * Controller para a função Callable 'createSubscription'.
 */
export const handleCreateSubscription = async (data: any, context: functionsV1.https.CallableContext) => {
    // 1. Validação de Autenticação
    if (!context.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "Você precisa estar logado para criar uma assinatura."
        );
    }
    const { uid } = context.auth;

    // 2. Validação de Dados de Entrada
    const { planId } = data;
    if (!planId) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "O ID do plano é obrigatório."
        );
    }

    try {
        // 3. Buscar Dados do Usuário
        const userRef = db.collection("users").doc(uid);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Perfil de usuário não encontrado.");
        }
        const userData = userDoc.data() as UserProfile;
        userData.uid = userDoc.id; // Garante que o UID está no objeto

        // 4. Chamar Serviços
        const customerId = await findOrCreateAsaasCustomer(userData);
        const { subscriptionId, checkoutUrl } = await createAsaasSubscription(customerId, planId);

        // 5. Atualizar Firestore (status inicial, IDs)
        await userRef.update({
            asaasSubscriptionId: subscriptionId, // Salva o ID da assinatura na raiz do doc do usuário
            "subscription.status": "pending",     // Define o status inicial no objeto 'subscription'
            "subscription.plan": planId,          // Salva o ID do plano
            "subscription.asaasSubscriptionId": subscriptionId, // Salva também dentro de 'subscription'
            "subscription.asaasCustomerId": customerId,         // Salva o customer ID aqui também
        });

        // 6. Retornar Resultado
        return { checkoutUrl: checkoutUrl };

    } catch (error) {
        // Loga o erro original
        functions.logger.error("Erro no controller createSubscription:", error);
        // Relança o erro para o cliente (HttpsError são tratados automaticamente)
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        // Encapsula outros erros
        throw new functions.https.HttpsError("internal", "Ocorreu um erro ao processar a assinatura.");
    }
};

/**
 * Controller para a função HTTP 'handleAsaasWebhook'.
 */
export const handleAsaasWebhookRequest = async (request: functionsV1.https.Request, response: functionsV1.Response) => {
    functions.logger.info("Webhook Asaas recebido - Controller");

    // 1. Validar Token
    const requestToken = request.headers["asaas-webhook-token"];
    if (requestToken !== ASAAS_WEBHOOK_TOKEN) {
        functions.logger.warn("Token de webhook inválido.");
        response.status(403).send("Forbidden: Token de webhook inválido.");
        return;
    }

    const event = request.body;

    // 2. Validar Estrutura Mínima do Evento
    if (!event || !event.event || !event.subscription || !event.subscription.id || !event.subscription.status) {
        functions.logger.warn("Webhook recebido com estrutura inválida:", event);
        response.status(400).send("Bad Request: Estrutura do evento inválida.");
        return;
    }

    const { id: subscriptionId, status: asaasStatus } = event.subscription;
    const eventType = event.event;

    try {
        // 3. Chamar Serviço para Atualizar Status
        functions.logger.info(`Processando evento '${eventType}' para a assinatura: ${subscriptionId}`);
        await updateUserSubscriptionStatus(subscriptionId, asaasStatus);

        // 4. Responder ao Asaas
        response.status(200).send("OK (Webhook processado com sucesso)");

    } catch (error) {
        functions.logger.error(`Erro ao processar webhook ${eventType} para ${subscriptionId}:`, error);
        // Mesmo em caso de erro interno nosso, respondemos 200 OK para o Asaas
        // para evitar retentativas desnecessárias, já que logamos o erro.
        // Poderíamos responder 500 se quiséssemos que o Asaas tentasse novamente.
        response.status(200).send(`OK (Erro interno ao processar sub: ${subscriptionId})`);
    }
};