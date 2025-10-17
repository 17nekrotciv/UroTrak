export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled" | "free";


export interface Subscription {
    status: SubscriptionStatus;
    plan: string; // ex: 'free', 'pro'
    patientLimit: number;
    stripeCustomerId?: string;
    subscriptionId?: string;
}

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    role: "doctor" | "user";
    clinicId: string;
    subscription?: Subscription;
    // Dados profissionais e pessoais
    crm?: string;
    especializacao?: string;
    rqe?: string;
    cpf?: string;
    phone?: string;
    birthDate?: string;
    gender?: "Masculino" | "Feminino";
    address?: {
        street?: string;
        number?: string;
        complement?: string;
        neighborhood?: string;
        city?: string;
        state?: string;
        zipCode?: string;
    };
}
export interface SubscriptionPlanDetails {
    priceId: string;
    name: string;
    patientLimit: number;
}

export { };
