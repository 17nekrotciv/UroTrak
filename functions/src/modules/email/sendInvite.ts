import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import sgMail from "@sendgrid/mail";

// Define a variável secreta (para usar SENDGRID_API_KEY)

const db = getFirestore("uritrak");

interface InviteData {
    email: string;
}

// --- FUNÇÃO DE CONVITE CORRIGIDA ---
export const sendPatientInvite = onCall(
    // ✅ 1. REMOVIDO o objeto { secrets: [...] } daqui
    async (request) => {
        // ✅ 2. Acessar a chave e verificar se ela existe NO INÍCIO da função
        const sendgridApiKey = process.env.SENDGRID_API_KEY;
        if (!sendgridApiKey) {
            logger.error("A variável de ambiente SENDGRID_API_KEY não está configurada.");
            throw new HttpsError("internal", "Erro de configuração do servidor. Não foi possível enviar o e-mail.");
        }

        // 3. Autenticação (seu código original)
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

            // 4. Buscar dados do médico (seu código original)
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

            // 5. Verificar se e-mail já existe no Firebase Auth (seu código original)
            try {
                await admin.auth().getUserByEmail(patientEmail);
                throw new HttpsError(
                    "already-exists",
                    "Este e-mail já está cadastrado no sistema."
                );
            } catch (error: any) {
                // Se o erro for "usuário não encontrado", está tudo certo para continuar.
                // Se for outro erro, lançamos uma exceção.
                if (error.code !== "auth/user-not-found") {
                    // Se o erro já for do tipo HttpsError (como "already-exists"), relançamos ele
                    if (error instanceof HttpsError) throw error;

                    // Se for um erro inesperado do Auth
                    logger.error("Erro inesperado ao verificar e-mail no Auth:", error);
                    throw new HttpsError("internal", "Erro ao verificar e-mail do paciente.");
                }
            }

            // 6. Criar convite no Firestore (seu código original)
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

            // 7. Link de registro (IMPORTANTE: ajuste a URL para a do seu site em produção)
            const registrationUrl = `http://localhost:3000/signup?invite=${inviteId}&clinic=${clinicId}`

            // 8. Enviar e-mail com SendGrid
            // ✅ 3. Usar a variável 'sendgridApiKey' diretamente, sem o .value()
            sgMail.setApiKey(sendgridApiKey);

            const msg = {
                to: patientEmail,
                from: {
                    email: "urotrack@clinicauroonco.com.br", // ❗ USE UM E-MAIL VERIFICADO NO SENDGRID
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
)
