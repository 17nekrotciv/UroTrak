// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Log a warning if placeholder values from .env are detected or if essential keys are missing.
if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_API_KEY_HERE") {
  console.warn(
    "Firebase API Key is not configured correctly or is using a placeholder value from .env. " +
    "Please update NEXT_PUBLIC_FIREBASE_API_KEY in your .env file with your actual Firebase project credential. " +
    "The application will likely not function correctly until this is resolved."
  );
} else if (!firebaseConfig.projectId) {
  console.warn(
    "Firebase Project ID is not configured. Please set NEXT_PUBLIC_FIREBASE_PROJECT_ID in your .env file."
  );
}


// Initialize Firebase
// Firebase initializeApp will throw an error if critical parts of the config are missing or invalid.
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
