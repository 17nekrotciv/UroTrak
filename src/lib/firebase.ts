// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider
} from 'firebase/auth';
// Atualizado: Importar initializeFirestore e persistentLocalCache
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

if (!apiKey || apiKey === "YOUR_API_KEY_HERE" || apiKey.trim() === "" || !apiKey.startsWith("AIza")) {
  console.error(
    "ERRO CRÍTICO DE CONFIGURAÇÃO DO FIREBASE: " +
    "A variável NEXT_PUBLIC_FIREBASE_API_KEY não está definida, está usando um valor de placeholder, ou parece inválida. " +
    "Por favor, verifique seu arquivo .env ou .env.local e adicione suas credenciais reais do Firebase. " +
    "A aplicação provavelmente não funcionará corretamente até que isso seja resolvido. " +
    "Após adicionar as chaves, REINICIE o servidor de desenvolvimento."
  );
} else if (!projectId || projectId === "YOUR_PROJECT_ID_HERE" || projectId.trim() === "") {
  console.error(
    "ERRO DE CONFIGURAÇÃO DO FIREBASE: " +
    "A variável NEXT_PUBLIC_FIREBASE_PROJECT_ID não está definida ou está usando um valor de placeholder. " +
    "Verifique seu arquivo .env ou .env.local."
  );
}

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

// Inicializar o Firestore com as configurações de cache persistente usando a nova API
const db = initializeFirestore(app, {
  cache: persistentLocalCache({ /* Configurações de cache podem ser adicionadas aqui, se necessário */ })
});
console.log("Persistência offline do Firestore configurada usando FirestoreSettings.cache.");

// A chamada antiga para enableIndexedDbPersistence() foi removida.
// O Firestore agora lida com a inicialização do cache internamente com base nas configurações fornecidas.

// Auth Providers
const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();
const appleProvider = new OAuthProvider('apple.com'); // Requires specific configuration in Firebase console
const microsoftProvider = new OAuthProvider('microsoft.com'); // Requires specific configuration in Firebase console

export {
  app,
  auth,
  db,
  googleProvider,
  facebookProvider,
  appleProvider,
  microsoftProvider
};
