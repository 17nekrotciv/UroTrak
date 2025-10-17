import * as admin from "firebase-admin";
import { UserProfile } from "../../../types/user";

const db = admin.firestore();

/**
 * Busca o perfil de um usuário no Firestore.
 * @param uid - O ID do usuário.
 * @returns O perfil do usuário ou null se não for encontrado.
 */
async function getProfile(uid: string): Promise<UserProfile | null> {
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
        return null;
    }
    return userDoc.data() as UserProfile;
}

/**
 * Verifica se um médico pode adicionar mais pacientes com base na sua assinatura.
 * @param doctorProfile - O perfil completo do médico.
 * @throws Lança um erro se o limite for atingido ou a assinatura não estiver ativa.
 */
async function checkPatientLimit(doctorProfile: UserProfile): Promise<void> {
    // Define um plano padrão caso o campo de subscrição ainda não exista
    const sub = doctorProfile.subscription || { status: "free", patientLimit: 5 };

    if (sub.status !== "active" && sub.status !== "trialing") {
        throw new Error("Sua assinatura não está ativa. Por favor, atualize seu plano.");
    }

    // Conta apenas os usuários com a role 'user' na mesma clínica
    const query = await db.collection("users").where("clinicId", "==", doctorProfile.clinicId).where("role", "==", "user").get();
    const patientCount = query.size;

    if (patientCount >= sub.patientLimit) {
        throw new Error(`Você atingiu o seu limite de ${sub.patientLimit} pacientes.`);
    }
}

/**
 * Cria um novo usuário paciente no Firebase Authentication e no Firestore.
 * @param patientData - Os dados do novo paciente.
 * @returns O registro do usuário criado.
 */
async function createPatient(patientData: any) {
    const userRecord = await admin.auth().createUser({
        email: patientData.email,
        password: patientData.password,
        displayName: patientData.displayName,
    });

    const patientProfile: Partial<UserProfile> = {
        displayName: patientData.displayName,
        email: patientData.email,
        role: "user",
        clinicId: patientData.clinicId,
        cpf: patientData.cpf || null,
        phone: patientData.phone || null,
        birthDate: patientData.birthDate || null,
        gender: patientData.gender || null,
        address: patientData.address || {},
    };

    await db.collection("users").doc(userRecord.uid).set(patientProfile, { merge: true });
    return userRecord;
}

/**
 * Cria um documento de perfil no Firestore para um novo usuário de autenticação.
 * Atribui valores padrão, incluindo uma assinatura gratuita.
 * @param user - O objeto de usuário do Firebase Authentication.
 * @returns O perfil do novo usuário.
 */
async function initializeProfile(user: admin.auth.UserRecord): Promise<UserProfile> {
    const newUserProfile: Partial<UserProfile> = {
        uid: user.uid,
        email: user.email!,
        displayName: user.displayName || user.email!.split('@')[0],
        role: "user", // Sempre começa como 'user'. O fluxo de cadastro de médico irá atualizar.
        clinicId: "", // Será preenchido mais tarde.
        subscription: {
            status: "free",
            plan: "free",
            patientLimit: 5, // Limite padrão para o plano gratuito.
        },
    };

    await db.collection("users").doc(user.uid).set(newUserProfile);
    console.log(`Perfil inicializado para o novo utilizador: ${user.uid}`);

    return newUserProfile as UserProfile;
}

export const UserService = {
    getProfile,
    checkPatientLimit,
    createPatient,
    initializeProfile,
};