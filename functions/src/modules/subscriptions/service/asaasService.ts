import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import axios, { AxiosError } from "axios";
import { Subscription, UserProfile } from "../../../types/user";

// Carrega as chaves secretas
const ASAAS_API_KEY = process.env.ASAAS_API_KEY
// Mude para sandbox se necessário
const ASAAS_API_URL = "https://sandbox.asaas.com/v3";

const db = admin.firestore();

// Cliente Axios
const asaasApi = axios.create({
    baseURL: ASAAS_API_URL,
    headers: {
        "access_token": ASAAS_API_KEY,
        "Content-Type": "application/json",
    },
});

/**
 * Busca ou cria um cliente no Asaas.
 * @param {UserProfile} userData - Dados do usuário do Firestore.
 * @returns {Promise<string>} O ID do cliente Asaas.
 */
export const findOrCreateAsaasCustomer = async (userData: UserProfile): Promise<string> => {
    if (userData.asaasCustomerId) {
        functions.logger.info(`Cliente Asaas ${userData.asaasCustomerId} já existe para o usuário: ${userData.uid}`);
        return userData.asaasCustomerId;
    }

    functions.logger.info(`Criando novo cliente Asaas para o usuário: ${userData.uid}`);
    const customerPayload = {
        name: userData.displayName,
        email: userData.email,
        cpfCnpj: userData.cpf,
        mobilePhone: userData.phone,
    };

    try {
        const customerResponse = await asaasApi.post("/customers", customerPayload);
        const customerId = customerResponse.data.id;

        // Salva o ID no Firestore
        const userRef = db.collection("users").doc(userData.uid);
        await userRef.update({ asaasCustomerId: customerId });
        functions.logger.info(`Cliente Asaas ${customerId} criado e salvo para ${userData.uid}`);
        return customerId;
    } catch (error) {
        functions.logger.error("Erro ao criar cliente Asaas:", error);
        if (axios.isAxiosError(error)) {
            functions.logger.error("Detalhes do erro Asaas (Cliente):", (error as AxiosError).response?.data);
        }
        throw new functions.https.HttpsError("internal", "Falha ao criar cliente no gateway de pagamento.");
    }
};

/**
 * Cria uma assinatura no Asaas.
 * @param {string} customerId - O ID do cliente Asaas.
 * @param {string} planId - O ID do plano Asaas (ou outro identificador).
 * @param {string} billingType - Tipo de cobrança ("CREDIT_CARD", "BOLETO", "UNDEFINED").
 * @returns {Promise<{subscriptionId: string; checkoutUrl: string}>} ID e URL de checkout da assinatura.
 */
export const createAsaasSubscription = async (
    customerId: string,
    planId: string, // Ou pode ser um objeto com { value, cycle, description }
    billingType: "CREDIT_CARD" | "BOLETO" | "UNDEFINED" = "UNDEFINED"
): Promise<{ subscriptionId: string; checkoutUrl: string }> => {
    functions.logger.info(`Criando assinatura Asaas para o cliente: ${customerId}, plano: ${planId}`);

    // Define os dados da assinatura
    const subscriptionPayload = {
        customer: customerId,
        billingType: billingType,
        nextDueDate: new Date().toISOString().split("T")[0], // Data de hoje
        // --- Use UMA das opções abaixo ---
        // Opção 1: Usando Planos criados no Asaas (RECOMENDADO)
        plan: planId,

        // Opção 2: Definindo valor e ciclo diretamente (REMOVA 'plan' se usar esta)
        // value: 49.90, // Você precisaria buscar esse valor
        // cycle: "MONTHLY",
        // description: "Assinatura Plano Pro UroTrack",
        // ---------------------------------
    };


    try {
        const subscriptionResponse = await asaasApi.post("/subscriptions", subscriptionPayload);
        const { id, checkoutUrl } = subscriptionResponse.data;
        functions.logger.info(`Assinatura Asaas ${id} criada para o cliente ${customerId}`);
        return { subscriptionId: id, checkoutUrl: checkoutUrl };
    } catch (error) {
        functions.logger.error("Erro ao criar assinatura Asaas:", error);
        if (axios.isAxiosError(error)) {
            functions.logger.error("Detalhes do erro Asaas (Assinatura):", (error as AxiosError).response?.data);
        }
        throw new functions.https.HttpsError("internal", "Falha ao criar assinatura no gateway de pagamento.");
    }
};

/**
 * Atualiza o status da assinatura de um usuário no Firestore.
 * @param {string} asaasSubscriptionId - ID da assinatura no Asaas.
 * @param {string} asaasStatus - Status recebido do webhook do Asaas.
 * @returns {Promise<void>}
 */
export const updateUserSubscriptionStatus = async (
    asaasSubscriptionId: string,
    asaasStatus: string
): Promise<void> => {
    functions.logger.info(`Buscando usuário pela assinatura Asaas: ${asaasSubscriptionId}`);

    const usersQuery = await db.collection("users")
        .where("asaasSubscriptionId", "==", asaasSubscriptionId)
        .limit(1)
        .get();

    if (usersQuery.empty) {
        functions.logger.error(`Nenhum usuário encontrado para a assinatura Asaas: ${asaasSubscriptionId}`);
        // Não lançamos erro aqui, apenas logamos, pois o webhook precisa retornar 200 OK.
        return;
    }

    const userDoc = usersQuery.docs[0];
    const userRef = userDoc.ref;
    const userData = userDoc.data() as UserProfile;

    // Mapeia o status do Asaas para o status do nosso App
    let newStatus: Subscription["status"] = userData.subscription?.status || "pending";

    switch (asaasStatus) {
        case "ACTIVE":
        case "CONFIRMED": // Pagamento confirmado
            newStatus = "active";
            break;
        case "INACTIVE": // Assinatura Inativada (pode ser por cancelamento ou outro motivo)
        case "CANCELLED": // Assinatura Cancelada explicitamente
        case "EXPIRED": // Assinatura Expirada (ciclo terminou e não renovou)
            newStatus = "canceled";
            break;
        case "OVERDUE": // Cobrança vencida
            newStatus = "past_due";
            break;
        case "PENDING": // Aguardando pagamento (Boleto gerado, por exemplo)
            newStatus = "pending"; // Ou talvez um status específico 'awaiting_payment'?
            break;
        // Adicione outros status do Asaas se necessário
    }

    if (newStatus !== userData.subscription?.status) {
        functions.logger.info(`Atualizando status do usuário ${userDoc.id} de '${userData.subscription?.status}' para '${newStatus}'`);
        await userRef.update({
            "subscription.status": newStatus,
        });
    } else {
        functions.logger.info(`Status do usuário ${userDoc.id} já é '${newStatus}'. Nenhuma atualização necessária.`);
    }
};