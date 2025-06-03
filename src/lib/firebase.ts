// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  FacebookAuthProvider, 
  OAuthProvider 
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_API_KEY_HERE") {
  console.warn(
    "Firebase API Key is not configured correctly or is using a placeholder value. " +
    "Please update NEXT_PUBLIC_FIREBASE_API_KEY in your .env file with your actual Firebase project credential. " +
    "The application will likely not function correctly until this is resolved."
  );
} else if (!firebaseConfig.projectId) {
  console.warn(
    "Firebase Project ID is not configured. Please set NEXT_PUBLIC_FIREBASE_PROJECT_ID in your .env file."
  );
}

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// Auth Providers
const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();
const appleProvider = new OAuthProvider('apple.com');
const microsoftProvider = new OAuthProvider('microsoft.com');

// You can customize provider scopes or parameters here if needed
// For example, for Apple to request name and email:
// appleProvider.addScope('email');
// appleProvider.addScope('name');

export { 
  app, 
  auth, 
  db, 
  googleProvider, 
  facebookProvider, 
  appleProvider, 
  microsoftProvider 
};
