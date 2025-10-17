// functions/src/index.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";


/**
 * @fileOverview Cloud Function (v2 SDK) para criar uma conta de paciente.
 * - Recebe os dados do paciente via HTTPS.
 * - Cria um usuário no Firebase Authentication.
 * - Salva o perfil detalhado do usuário no Firestore.
 * - Associa o usuário à clínica do médico solicitante.
 */

interface PatientData {
    displayName: string;
    email: string;
    password?: string;
    cpf: string;
    phone: string;
    birthDate: string;
    gender: 'Masculino' | 'Feminino';
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    clinicId: string;
}

// ✅ CORREÇÃO FINAL: Usando a sintaxe 'onCall' do SDK v2.
// A estrutura agora é um objeto com uma propriedade 'handler'.
export const createPatientUser = onCall(async (request) => {
    // 1. Validação de Autenticação
    if (!request.auth) {
        logger.warn("Requisição não autenticada recebida.");
        throw new HttpsError(
            "unauthenticated",
            "A requisição deve ser feita por um usuário autenticado."
        );
    }

    // 2. Validação de Permissão (Regra de Negócio)
    const requesterDoc = await admin
        .firestore()
        .collection("users")
        .doc(request.auth.uid)
        .get();

    if (!requesterDoc.exists || requesterDoc.data()?.role !== "doctor") {
        logger.error(`Usuário ${request.auth.uid} 
            tentou criar paciente sem permissão.`);
        throw new HttpsError(
            "permission-denied",
            "Apenas médicos podem criar contas de pacientes."
        );
    }

    // O objeto 'data' vem dentro de 'request'.
    const data: PatientData = request.data;
    const { email, password, displayName } = data;

    // 3. Validação dos Dados Recebidos
    if (!email || !password || !displayName) {
        throw new HttpsError(
            "invalid-argument",
            "Email, senha e nome de exibição são obrigatórios."
        );
    }

    try {
        // 4. Criação do Usuário no Firebase Authentication
        const userRecord = await admin.auth().createUser({
            email,
            password,
            displayName,
            emailVerified: false,
        });

        // 5. Preparação do Documento para o Firestore
        const userProfileData = {
            displayName: data.displayName,
            email: data.email,
            cpf: data.cpf,
            phone: data.phone,
            birthDate: data.birthDate,
            gender: data.gender,
            address: {
                zipCode: data.cep,
                street: data.street,
                number: data.number,
                complement: data.complement || null,
                neighborhood: data.neighborhood,
                city: data.city,
                state: data.state,
            },
            role: "user",
            clinicId: requesterDoc.data()?.clinicId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        // 6. Salvando o Perfil no Firestore
        await admin
            .firestore()
            .collection("users")
            .doc(userRecord.uid)
            .set(userProfileData);

        logger.info(`Paciente ${displayName} (UID: ${userRecord.uid}) 
            criado com sucesso pelo médico ${request.auth.uid}.`);

        return {
            success: true,
            message: `Usuário ${displayName} 
            criado com sucesso com o UID: ${userRecord.uid}`,
        };
    } catch (error: any) {
        // 7. Tratamento de Erros
        logger.error("Erro detalhado ao criar paciente:", error);

        if (error.code === "auth/email-already-exists") {
            throw new HttpsError(
                "already-exists",
                "Este email já está cadastrado no sistema."
            );
        }

        throw new HttpsError(
            "internal",
            "Ocorreu um erro inesperado ao criar a conta do paciente."
        );
    }
});