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

  const handleError = useCallback((error: FirestoreError, collectionName: string) => {
    console.error(`Error fetching ${collectionName}: `, error.code, error.message);
    let description = `Não foi possível carregar os dados de ${collectionName}.`;

    if (error.code === 'permission-denied') {
      description = `Acesso negado para buscar dados de ${collectionName}. Isso geralmente é causado por Regras de Segurança do Firestore que não permitem a leitura. Verifique suas regras no Console do Firebase.`;
    } else if (error.code === 'unauthenticated') {
      description = `Usuário não autenticado para buscar dados de ${collectionName}.`;
    } else if (error.code === 'invalid-argument') {
      description = `Requisição inválida para ${collectionName}. Isso pode ser um sinal de que as credenciais do Firebase (API Key, Project ID) no seu arquivo .env estão incorretas.`;
    } else if (error.code === 'unavailable' || (error.message && error.message.toLowerCase().includes('client is offline'))) {
      description = `Erro ao buscar dados de ${collectionName}. O aplicativo indica 'offline'. **Esta é a causa mais comum de Regras de Segurança do Firestore incorretas.** Por favor, vá ao seu console do Firebase, na seção Firestore > Regras, e garanta que as regras do arquivo 'firestore.rules' do projeto foram aplicadas. Se as regras estiverem corretas, verifique sua conexão com a internet.`;
    }
    toast({
      title: "Erro de Conexão com o Banco de Dados",
      description,
      variant: "destructive",
      duration: 10000
    });
  }, [toast]);

  useEffect(() => {
    if (!user) {
      setAppData({ urinaryLogs: [], erectileLogs: [], psaLogs: [] });
      setLoadingData(false);
      return;
    }
    setLoadingData(true);
    
    const collectionsToSubscribe: { key: keyof AppData; path: string; name: string }[] = [
      { key: 'urinaryLogs', path: 'urinary_logs', name: 'sintomas urinários' },
      { key: 'erectileLogs', path: 'erectile_logs', name: 'função erétil' },
      { key: 'psaLogs', path: 'psa_logs', name: 'resultados PSA' },
    ];

    const initialLoads = new Set<string>();
    const totalListeners = collectionsToSubscribe.length;

    const unsubscribes = collectionsToSubscribe.map(({ key, path, name }) => {
      const q = query(collection(db, 'users', user.uid, path), orderBy('date', 'desc'));
      
      const processSnapshotCompletion = () => {
        if (!initialLoads.has(key)) {
            initialLoads.add(key);
            if (initialLoads.size === totalListeners) {
                setLoadingData(false);
            }
        }
      };
      
      const unsubscribe = onSnapshot(q,
        (snapshot: QuerySnapshot) => {
          const items = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            date: (doc.data().date as Timestamp).toDate().toISOString(),
          }));
          setAppData(prev => ({ ...prev, [key]: items }));
          processSnapshotCompletion();
        },
        (error: FirestoreError) => {
          handleError(error, name);
          processSnapshotCompletion();
        }
      );
      return unsubscribe;
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [user, handleError]);

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
