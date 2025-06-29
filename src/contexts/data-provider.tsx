
// src/contexts/data-provider.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { UrinaryLogEntry, ErectileLogEntry, PSALogEntry, AppData } from '@/types';
import { useAuth } from './auth-provider';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, orderBy, Timestamp, onSnapshot, type FirestoreError, type QuerySnapshot } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";

interface DataContextType {
  appData: AppData;
  loadingData: boolean;
  addUrinaryLog: (log: Omit<UrinaryLogEntry, 'id' | 'date'> & { date: Date }) => Promise<void>;
  addErectileLog: (log: Omit<ErectileLogEntry, 'id' | 'date'> & { date: Date }) => Promise<void>;
  addPSALog: (log: Omit<PSALogEntry, 'id' | 'date'> & { date: Date }) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [appData, setAppData] = useState<AppData>({
    urinaryLogs: [],
    erectileLogs: [],
    psaLogs: [],
  });
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!user) {
      setAppData({ urinaryLogs: [], erectileLogs: [], psaLogs: [] });
      setLoadingData(true);
      return;
    }

    const collectionsToSubscribe: { key: keyof AppData; path: string; name: string }[] = [
      { key: 'urinaryLogs', path: 'urinary_logs', name: 'sintomas urinários' },
      { key: 'erectileLogs', path: 'erectile_logs', name: 'função erétil' },
      { key: 'psaLogs', path: 'psa_logs', name: 'resultados PSA' },
    ];
    
    const handleError = (error: FirestoreError, collectionName: string) => {
      console.error(`Error fetching ${collectionName}: `, error);
      let description = `Não foi possível carregar os dados de ${collectionName}.`;

      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
      if (!apiKey || !apiKey.startsWith('AIza')) {
          description = "A chave de API do Firebase está faltando ou é inválida. Verifique seu arquivo .env.local.";
      } else if (error.code === 'permission-denied' || error.message.includes('400')) {
        description = `Acesso negado ou requisição inválida para ${collectionName}. Isso geralmente é causado por credenciais de configuração incorretas no arquivo .env.local ou por regras de segurança do Firestore que não permitem o acesso.`;
      } else if (error.code === 'unavailable' || (error.message && error.message.toLowerCase().includes('client is offline'))) {
         description = `Não foi possível carregar ${collectionName}. Verifique sua conexão com a internet.`;
      }
      
      toast({ 
        title: "Erro de Conexão com o Banco de Dados", 
        description, 
        variant: "destructive",
        duration: 9000
      });
      setLoadingData(false);
    };

    const unsubscribes = collectionsToSubscribe.map(({ key, path, name }) => {
      const q = query(collection(db, 'users', user.uid, path), orderBy('date', 'desc'));
      
      return onSnapshot(q, 
        (snapshot: QuerySnapshot) => {
          const items = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            date: (doc.data().date as Timestamp).toDate().toISOString(),
          }));
          setAppData(prev => ({ ...prev, [key]: items }));
          setLoadingData(false);
        },
        (error: FirestoreError) => handleError(error, name)
      );
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [user, toast]);

  const addLog = async <T extends { date: Date }>(collectionName: string, log: Omit<T, 'id'> ) => {
    if (!user) {
      console.error("User not logged in to add data.");
      throw new Error("Usuário não autenticado. Não é possível salvar os dados.");
    }
    try {
      const logWithTimestamp = { ...log, date: Timestamp.fromDate(log.date) };
      await addDoc(collection(db, 'users', user.uid, collectionName), logWithTimestamp);
    } catch (error) {
      console.error(`Error adding ${collectionName} log: `, error);
      throw error; 
    }
  };

  const addUrinaryLog = (log: Omit<UrinaryLogEntry, 'id' | 'date'> & { date: Date }) => addLog('urinary_logs', log);
  const addErectileLog = (log: Omit<ErectileLogEntry, 'id' | 'date'> & { date: Date }) => addLog('erectile_logs', log);
  const addPSALog = (log: Omit<PSALogEntry, 'id' | 'date'> & { date: Date }) => addLog('psa_logs', log);

  return (
    <DataContext.Provider value={{ appData, loadingData, addUrinaryLog, addErectileLog, addPSALog }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
