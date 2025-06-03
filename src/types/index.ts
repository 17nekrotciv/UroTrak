// src/types/index.ts
import type { User as FirebaseUser } from 'firebase/auth';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName?: string | null;
}

export interface UrinaryLogEntry {
  id?: string;
  date: string; // ISO string or Firestore Timestamp
  urgency: boolean;
  burning: boolean;
  lossGrams: number | null;
  padChanges: number | null;
}

export interface ErectileLogEntry {
  id?: string;
  date: string; // ISO string or Firestore Timestamp
  erectionQuality: string; // Could be a scale like 'None', 'Partial', 'Full'
  medicationUsed: 'none' | 'tadalafil5' | 'tadalafil20' | 'sildenafil';
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
