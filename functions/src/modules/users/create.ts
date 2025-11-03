// functions/src/index.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

// Importações modulares do Firestore
import {
    getFirestore,
    FieldValue
    // ✅ 'query' e 'where' REMOVIDOS daqui
} from "firebase-admin/firestore";


// Referência ao banco de dados "uritrak"
const db = getFirestore("uritrak");

// --- INTERFACES INTERNAS ---

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


interface AddressData {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
}

interface SignupData {
    displayName: string;
    email: string;
    role: 'doctor' | 'user';
    cpf: string;
    phone: string;
    birthDate: string;
    gender: 'Masculino' | 'Feminino';
    address: AddressData;
    crm?: string;
    clinicId?: string;
    especializacao?: string;
    rqe?: string;
    clinicName?: string;
    clinicCnpj?: string;
}

// --- FUNÇÃO 1: CREATE PATIENT USER ---
export const createPatientUser = onCall(async (request) => {
    if (!request.auth) {
        logger.warn("Requisição não autenticada recebida.");
        throw new HttpsError("unauthenticated", "A requisição deve ser feita por um usuário autenticado.");
    }
    if (!request.auth.uid) {
        logger.warn("Requisição autenticada, mas sem UID.");
        throw new HttpsError("invalid-argument", "O token de autenticação é inválido e não contém um UID.");
    }

    try {
        const requesterDoc = await db
            .collection("users")
            .doc(request.auth.uid)
            .get();

        if (!requesterDoc.exists) {
            logger.error(`Usuário ${request.auth.uid} não encontrado no Firestore.`);
            throw new HttpsError("permission-denied", "O usuário solicitante não possui um perfil válido no sistema.");
        }

        const requesterData = requesterDoc.data();
        const clinicId = requesterData?.clinicId;

        if (!clinicId) {
            logger.error(`Usuário ${request.auth.uid} não possui clinicId.`);
            throw new HttpsError("permission-denied", "O usuário solicitante não está associado a nenhuma clínica.");
        }

        const data: PatientData = request.data;
        const { email, password, displayName } = data;

        if (!email || !password || !displayName) {
            throw new HttpsError("invalid-argument", "Email, senha e nome de exibição são obrigatórios.");
        }

        const userRecord = await admin.auth().createUser({
            email,
            password,
            displayName,
            emailVerified: false,
        });

        const userProfileData = {
            uid: userRecord.uid,
            email: data.email,
            displayName: data.displayName,
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
            clinicId: clinicId,
            createdAt: FieldValue.serverTimestamp(),
            lastUpdatedAt: FieldValue.serverTimestamp(),
            asaasCustomerId: null,
            asaasSubscriptionId: null,
            subscription: {
                status: "free",
                plan: "free",
                patientLimit: 0,
            },
        };

        await db
            .collection("users")
            .doc(userRecord.uid)
            .set(userProfileData);

        logger.info(`Paciente ${displayName} (UID: ${userRecord.uid}) criado por ${request.auth.uid}.`);
        return { success: true, message: `Usuário ${displayName} criado com sucesso.` };

    } catch (error: any) {
        logger.error("Erro detalhado ao criar paciente:", error);
        if (error instanceof HttpsError) { throw error; }
        if (error.code === "auth/email-already-exists") {
            throw new HttpsError("already-exists", "Este email já está cadastrado no sistema.");
        }
        throw new HttpsError("internal", "Ocorreu um erro inesperado ao criar a conta.");
    }
});

// --- FUNÇÃO 3: COMPLETE USER REGISTRATION ---
export const completeUserRegistration = onCall(async (request) => {
    if (!request.auth) {
        logger.warn("Requisição não autenticada para completar registro.");
        throw new HttpsError("unauthenticated", "A requisição deve ser feita por um usuário recém-autenticado.");
    }

    const uid = request.auth.uid;
    const data: SignupData = request.data;
    const { email, displayName, role, cpf, address } = data;

    logger.info(`Iniciando 'completeUserRegistration' para UID: ${uid} com role: ${role}`);

    try {
        const batch = db.batch();

        // ✅ **CORREÇÃO DA SINTAXE DA QUERY**
        const cpfQuery = db.collection("users").where("cpf", "==", cpf);
        const cpfQuerySnapshot = await cpfQuery.get();
        if (!cpfQuerySnapshot.empty) {
            throw new HttpsError(
                "already-exists",
                "O CPF informado já está cadastrado no sistema."
            );
        }

        const commonUserData = {
            uid: uid,
            email: email,
            displayName: displayName,
            createdAt: FieldValue.serverTimestamp(),
            cpf: cpf,
            phone: data.phone,
            birthDate: data.birthDate,
            gender: data.gender,
            address: {
                street: address.street,
                number: address.number,
                complement: address.complement || null,
                neighborhood: address.neighborhood,
                city: address.city,
                state: address.state,
                zipCode: address.zipCode,
            },
            asaasCustomerId: null,
            asaasSubscriptionId: null,
            subscription: null,
        };

        if (role === 'doctor') {
            const { clinicCnpj, clinicName, crm, especializacao, rqe } = data;

            if (!crm || crm.length < 3) {
                throw new HttpsError("invalid-argument", "CRM é obrigatório para médicos.");
            }

            const clinicDocRef = db.collection("clinic").doc();
            const clinicId = clinicDocRef.id;
            let finalClinicName: string;
            let finalCnpj: string | null = null;

            if (clinicCnpj && clinicCnpj.length === 14) {

                // ✅ **CORREÇÃO DA SINTAXE DA QUERY**
                const cnpjQuery = db.collection("clinic").where("cnpj", "==", clinicCnpj);
                const cnpjSnapshot = await cnpjQuery.get();
                if (!cnpjSnapshot.empty) {
                    throw new HttpsError(
                        "already-exists",
                        "O CNPJ da clínica informado já está cadastrado."
                    );
                }
                finalCnpj = clinicCnpj;
                finalClinicName = clinicName || `Consultório (CNPJ: ${clinicCnpj})`;
            } else {
                finalClinicName = clinicName || `Consultório de ${displayName}`;
            }

            batch.set(clinicDocRef, {
                name: finalClinicName,
                ownerId: uid,
                createdAt: FieldValue.serverTimestamp(),
                cnpj: finalCnpj,
            });

            const userDocRef = db.collection("users").doc(uid);
            batch.set(userDocRef, {
                ...commonUserData,
                role: 'doctor',
                crm: crm,
                especializacao: especializacao || null,
                rqe: rqe || null,
                clinicId: clinicId,
                subscription: {
                    status: "pending",
                    plan: "free",
                    patientLimit: 5,
                },
            });

        } else {
            const userDocRef = db.collection("users").doc(uid);
            batch.set(userDocRef, {
                ...commonUserData,
                role: 'user',
                clinicId: data.clinicId || null,
                subscription: {
                    status: "free",
                    plan: "free",
                    patientLimit: 0,
                },
            });
        }

        await batch.commit();

        logger.info(`Registro (UID: ${uid}) completado com sucesso.`);
        return { success: true, message: `Usuário ${displayName} registrado.` };

    } catch (error: any) {
        logger.error(`Erro em 'completeUserRegistration' para UID: ${uid}`, error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError(
            "internal",
            "Ocorreu um erro inesperado ao salvar os dados do perfil."
        );
    }
});