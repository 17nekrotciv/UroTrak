// functions/src/index.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import sgMail from "@sendgrid/mail";
import { defineSecret } from "firebase-functions/params";

// --- INICIALIZAÇÃO E CONFIGURAÇÃO ---

// 1. Inicializar o Admin (Necessário para Auth e Firestore)

// 3. Obter o Firestore DEPOIS de inicializar
const db = getFirestore("uritrak");

// 4. Definir o segredo do SendGrid
const SENDGRID_API_KEY = defineSecret("SENDGRID_API_KEY");

// --- INTERFACES ---
interface InviteData {
    email: string;
}

// ... (Suas outras interfaces, como PatientData, SignupData) ...

// --- FUNÇÃO DE CONVITE ---
export const sendPatientInvite = onCall(
    { secrets: [SENDGRID_API_KEY] }, // Vincula o segredo
    async (request) => {
        // 1. Autenticação
        if (!request.auth || !request.auth.uid) {
            logger.warn("Requisição não autenticada ou UID ausente.");
            throw new HttpsError(
                "unauthenticated",
                "Você deve estar autenticado para enviar convites."
            );
        }

        try {
            const data: InviteData = request.data;
            const patientEmail = data.email;
            const doctorUid = request.auth.uid;

            if (!patientEmail) {
                throw new HttpsError(
                    "invalid-argument",
                    "O e-mail do paciente é obrigatório."
                );
            }

            // 2. Buscar dados do médico
            const doctorDoc = await db.collection("users").doc(doctorUid).get();
            if (!doctorDoc.exists || doctorDoc.data()?.role !== 'doctor') {
                throw new HttpsError("permission-denied", "Apenas médicos podem enviar convites.");
            }

            const doctorData = doctorDoc.data();
            const clinicId = doctorData?.clinicId;
            const doctorName = doctorData?.displayName;

            if (!clinicId) {
                throw new HttpsError(
                    "permission-denied",
                    "O solicitante não está associado a nenhuma clínica."
                );
            }

            // 3. Verificar se e-mail já existe no Firebase Auth
            try {
                await admin.auth().getUserByEmail(patientEmail);
                throw new HttpsError(
                    "already-exists",
                    "Este e-mail já está cadastrado no sistema."
                );
            } catch (error: any) {
                if (error.code !== "auth/user-not-found") {
                    if (error instanceof HttpsError) throw error;
                    logger.error("Erro inesperado ao verificar e-mail no Auth:", error);
                    throw new HttpsError("internal", "Erro ao verificar e-mail do paciente.");
                }
            }

            // 4. Criar convite no Firestore
            const inviteRef = db.collection("patientInvites").doc();
            const inviteId = inviteRef.id;
            const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 horas

            await inviteRef.set({
                emailToInvite: patientEmail,
                clinicId,
                invitedByUid: doctorUid,
                status: "pending",
                createdAt: FieldValue.serverTimestamp(),
                expiresAt: Timestamp.fromDate(expiresAt),
            });

            // 5. Link de registro (⚠️ ATUALIZE PARA PRODUÇÃO)
            const registrationUrl = `//https://studio--urotrack-qqp6e.us-central1.hosted.app/signup?invite=${inviteId}&clinic=${clinicId}`;

            // 6. Enviar e-mail com SendGrid
            sgMail.setApiKey(SENDGRID_API_KEY.value());

            const msg = {
                to: patientEmail,
                from: {
                    email: "urotrack@clinicauroonco.com.br", // O e-mail verificado no SendGrid
                    name: doctorName || "Clínica Uro Onco",
                },
                subject: `Convite de ${doctorName || "sua clínica"} para o UroTrack`,
                html: `
                    <div style="font-family: sans-serif; padding: 20px;">
                      <p>Olá!</p>
                      <p>Você foi convidado(a) por <strong>${doctorName || "sua clínica"}</strong> para usar a plataforma UroTrack.</p>
                      <p><a href="${registrationUrl}" style="padding: 10px 15px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Clique aqui para completar seu cadastro.</a></p>
                      <p>Este link de convite expira em 48 horas.</p>
                    </div>
                `,
            };

            await sgMail.send(msg);
            logger.info(`Convite enviado para ${patientEmail} via SendGrid.`);

            return {
                success: true,
                message: `Convite enviado com sucesso para ${patientEmail}.`,
            };

        } catch (error: any) {
            logger.error("Erro detalhado ao enviar convite:", error);
            if (error instanceof HttpsError) throw error;
            throw new HttpsError("internal", "Erro inesperado ao processar o convite.");
        }
    }
);

// --- OUTRAS FUNÇÕES ---

// (Aqui entram suas outras funções: createPatientUser e completeUserRegistration)
// Lembre-se que elas também usarão a região "southamerica-east1"