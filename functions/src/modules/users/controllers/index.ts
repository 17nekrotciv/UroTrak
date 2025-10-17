import * as functions from "firebase-functions";
import * as functionsV1 from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { UserService } from "../service";

/**
 * Função Chamável (onCall): Permite que um médico crie uma conta para um novo paciente.
 * É chamada diretamente pelo frontend.
 */
export const createPatientUserex = functions.https.onCall(async (request) => {
    if (!request.auth) {
        throw new functions.https.HttpsError("unauthenticated", "A requisição precisa ser autenticada.");
    }
    const doctorUid = request.auth.uid;

    try {
        const doctorProfile = await UserService.getProfile(doctorUid);
        if (!doctorProfile || doctorProfile.role !== "doctor") {
            throw new functions.https.HttpsError("permission-denied", "Apenas médicos podem criar contas de pacientes.");
        }

        await UserService.checkPatientLimit(doctorProfile);

        const { email, password, displayName } = request.data;
        if (!email || !password || !displayName) {
            throw new functions.https.HttpsError("invalid-argument", "Dados essenciais como email, senha e nome são obrigatórios.");
        }

        const userRecord = await UserService.createPatient({ ...request.data, clinicId: doctorProfile.clinicId });

        console.log(`Paciente ${userRecord.uid} criado com sucesso pelo médico ${doctorUid}.`);
        return { success: true, message: `Paciente criado com sucesso.` };

    } catch (error: any) {
        console.error("Erro no controller createPatientUser:", error);
        if (error instanceof functions.https.HttpsError) throw error;
        throw new functions.https.HttpsError("internal", error.message || "Ocorreu um erro inesperado.");
    }
});

/**
 * Gatilho de Autenticação (onCreate): Executa automaticamente quando um novo usuário é criado no Firebase Auth.
 * Garante que todo novo usuário tenha um perfil básico e uma assinatura gratuita no Firestore.
 */
export const onUserCreate = functionsV1.auth.user().onCreate(async (user: admin.auth.UserRecord): Promise<void> => {
    try {
        // Chama o serviço para criar o documento de perfil com a assinatura gratuita padrão.
        await UserService.initializeProfile(user);
    } catch (error) {
        console.error(`Falha ao criar perfil para o utilizador ${user.uid}:`, error);
        // Opcional: Adicionar lógica para lidar com a falha (ex: enviar notificação para um canal de erro)
    }
});