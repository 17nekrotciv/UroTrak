// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider
} from 'firebase/auth';
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';

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

// Verificação rigorosa para garantir que as credenciais do Firebase estão configuradas.
// Isso causa uma "falha rápida" durante o desenvolvimento se as chaves estiverem ausentes ou incorretas.
if (!apiKey || apiKey.trim() === "" || !apiKey.startsWith("AIza")) {
  throw new Error(
    "ERRO CRÍTICO DE CONFIGURAÇÃO DO FIREBASE: " +
    "A variável NEXT_PUBLIC_FIREBASE_API_KEY não está definida ou parece inválida no seu arquivo .env. " +
    "Por favor, verifique suas credenciais no Console do Firebase e adicione-as ao arquivo .env (ou .env.local). " +
    "A aplicação não funcionará corretamente até que isso seja resolvido. " +
    "Lembre-se de REINICIAR o servidor de desenvolvimento após adicionar as chaves."
  );
} else if (!projectId || projectId.trim() === "") {
   throw new Error(
    "ERRO DE CONFIGURAÇÃO DO FIREBASE: " +
    "A variável NEXT_PUBLIC_FIREBASE_PROJECT_ID não está definida no seu arquivo .env. " +
    "Verifique seu arquivo .env (ou .env.local)."
  );
}

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

// Inicializa o Firestore com cache persistente para funcionamento offline.
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ /* Configurações de cache podem ser adicionadas aqui, se necessário */ })
});

// Provedores de Autenticação
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
