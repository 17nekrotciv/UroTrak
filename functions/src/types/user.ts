export interface Subscription {
    status: "active" | "trialing" | "past_due" | "canceled" | "free" | "pending";
    plan: string;
    patientLimit: number;
    asaasCustomerId?: string;
    asaasSubscriptionId?: string;
}

export interface SubscriptionPlanDetails {
    priceId: string;
    name: string;
    patientLimit: number;
}

// --- Tipos Estruturais (Faltantes) ---
export interface Address {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
}

export interface Clinic {
    id?: string;
    createdAt: any; // Para compatibilidade com FieldValue.serverTimestamp()
    name: string,
    ownerId: string,
    logoUrl?: string,
    cnpj?: string;
}

// --- Perfil de Usuário (Sua versão + 'clinic?: Clinic') ---
export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    role: "doctor" | "user";
    clinicId: string | null; // Pacientes podem ter null
    clinic?: Clinic; // Adicionado para compatibilidade com data-provider
    asaasCustomerId?: string;
    asaasSubscriptionId?: string;
    subscription?: Subscription | null; // Pode ser nulo
    crm?: string;
    especializacao?: string;
    rqe?: string;
    cpf?: string;
    phone?: string;
    birthDate?: string;
    gender?: "Masculino" | "Feminino";
    address?: Address; // Usando a interface Address
}


// --- Tipos de Log (Faltantes) ---
export interface UrinaryLogEntry {
    id?: string;
    date: string; // ISO string or Firestore Timestamp
    urgency: boolean;
    burning: boolean;
    physiotherapyExercise: boolean;
    lossGrams: number | null;
    padChanges: number | null;
    medicationNotes?: string;
}

export interface ErectileLogEntry {
    id?: string;
    date: string; // ISO string or Firestore Timestamp
    erectionQuality: string;
    medicationUsed?: string[]
    medicationNotes?: string;
}

export interface PSALogEntry {
    id?: string;
    date: string; // ISO string or Firestore Timestamp
    psaValue: number | null;
    notes?: string;
}

export interface AppData {
    urinaryLogs: UrinaryLogEntry[];
    erectileLogs: ErectileLogEntry[];
    psaLogs: PSALogEntry[];
}