// src/types/index.ts
import type { User as FirebaseUser } from 'firebase/auth';

export interface Address {
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}
export interface Subscription {
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'free';
  plan: 'free' | 'pro' | 'enterprise'; // Nomes dos seus planos
  patientLimit: number;
  stripeCustomerId?: string; // ID do cliente no Stripe
  subscriptionId?: string; // ID da assinatura no Stripe
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  role: string;
  clinicId: string
  clinic?: Clinic;
  cpf?: string;
  crm?: string;
  especializacao?: string;
  rqe?: string;
  phone?: string;
  birthDate?: string;
  gender?: 'Masculino' | 'Feminino'
  address?: Address;
  subscription?: Subscription
}

export interface Clinic {
  createdAt: string,
  name: string,
  ownerId: string,
  logoUrl?: string
}

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
  erectionQuality: string; // Could be a scale like 'None', 'Partial', 'Full'
  medicationUsed?: string[]
  medicationNotes?: string; // Optional notes about medication effectiveness
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

// For GenAI flow
export interface ReferralInfo {
  referralText: string;
}
