// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider
} from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, doc, getDoc, getFirestore } from 'firebase/firestore';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

try {
  initializeFirestore(app, {
      localCache: persistentLocalCache({ /* Configurações de cache podem ser adicionadas aqui, se necessário */ })
  });
} catch (error) {
  // Isso evita erros em ambientes de desenvolvimento onde o código pode rodar mais de uma vez.
  console.warn("Firestore já foi inicializado. Ignorando reinicialização.");
}

const db = getFirestore(app, 'uritrak');

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


export async function testFirebaseConnection(): Promise<{ success: boolean; message: string; error?: any }> {
  try {
    // This is a special document that should be publicly readable according to the firestore.rules.
    // It's a "health check" for the connection and rules setup.
    const testDocRef = doc(db, 'health_checks', 'status');
    await getDoc(testDocRef);
    return { success: true, message: 'Conexão com o Firebase e Firestore bem-sucedida!' };
  } catch (error: any) {
    console.error("Firebase connection test failed:", error);
    let message = 'Falha no teste de conexão com o Firebase. ';
    if (error.code === 'permission-denied') {
      message += 'Causa provável: Permissão negada. As Regras de Segurança do Firestore não foram atualizadas corretamente no Console do Firebase. Copie o conteúdo de `firestore.rules` e cole no seu projeto.';
    } else if (error.code === 'unavailable' || (error.message && error.message.toLowerCase().includes('offline'))) {
       message += `Causa provável: O cliente está offline. Isso geralmente significa que as credenciais no seu arquivo \`.env.local\` (API Key, Project ID, etc.) estão incorretas ou ausentes. Verifique o arquivo e reinicie o servidor.`;
    } else {
      message += `Erro inesperado: ${error.message} (código: ${error.code || 'N/A'})`;
    }
    return { success: false, message, error };
  }
}
