import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

// Inicialize o admin se ainda não o fez em outro lugar
// admin.initializeApp();

export const onClinicCreateSetDoctorClaims = functions.firestore
  .database("uritrak")
  .document("clinic/{clinicId}")
  .onCreate(async (snap, context) => {

    // 1. Pega os dados do documento da clínica que acabou de ser criado.
    const clinicData = snap.data();
    const clinicId = context.params.clinicId; // O ID da clínica (CNPJ)

    // 2. Extrai o ID do dono da clínica (que é o UID do médico).
    const doctorId = clinicData.ownerId;

    // 3. Verificação de segurança: garante que o ownerId existe.
    if (!doctorId) {
      logger.error(`A clínica ${clinicId} foi criada sem um ownerId. 
        Nenhum claim será definido.`);
      return; // Encerra a função
    }

    logger.log(`Nova clínica ${clinicId} criada pelo usuário ${doctorId}. 
      Definindo claims de médico...`);

    try {
      // 4. Define os custom claims no usuário correspondente (o médico).
      await admin.auth().setCustomUserClaims(doctorId, {
        role: "doctor",
        clinicId: clinicId, // O ID da clínica é o próprio ID do documento
      });

      logger.log(`Claims definidos com sucesso para o médico ${doctorId}.`);

    } catch (error) {
      logger.error(`Erro ao definir claims para o médico ${doctorId}:`, error);
    }
  });