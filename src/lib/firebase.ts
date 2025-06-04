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

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (!apiKey || apiKey === "YOUR_API_KEY_HERE" || apiKey.trim() === "") {
  console.error(
    "ERRO CRÍTICO DE CONFIGURAÇÃO DO FIREBASE: " +
    "A variável NEXT_PUBLIC_FIREBASE_API_KEY não está definida ou está usando um valor de placeholder. " +
    "Por favor, crie um arquivo .env.local na raiz do seu projeto (ou edite o .env existente) e adicione suas credenciais reais do Firebase. " +
    "Exemplo de .env.local:\n" +
    "NEXT_PUBLIC_FIREBASE_API_KEY=suaChaveDeApiReal\n" +
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seuDominioDeAutenticacaoReal\n" +
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID=seuIdDeProjetoReal\n" +
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seuStorageBucketReal\n" +
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seuMessagingSenderIdReal\n" +
    "NEXT_PUBLIC_FIREBASE_APP_ID=seuAppIdReal\n\n" +
    "A aplicação provavelmente não funcionará corretamente até que isso seja resolvido. " +
    "Após adicionar as chaves, REINICIE o servidor de desenvolvimento (npm run dev)."
  );
} else if (!projectId || projectId === "YOUR_PROJECT_ID_HERE" || projectId.trim() === "") {
  console.error(
    "ERRO DE CONFIGURAÇÃO DO FIREBASE: " +
    "A variável NEXT_PUBLIC_FIREBASE_PROJECT_ID não está definida ou está usando um valor de placeholder. " +
    "Verifique seu arquivo .env.local (ou .env)."
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

export { 
  app, 
  auth, 
  db, 
  googleProvider, 
  facebookProvider, 
  appleProvider, 
  microsoftProvider 
};
