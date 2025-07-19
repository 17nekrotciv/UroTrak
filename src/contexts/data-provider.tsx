"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { UrinaryLogEntry, ErectileLogEntry, PSALogEntry, AppData } from '@/types';
import { useAuth } from './auth-provider';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, query, orderBy, Timestamp, onSnapshot, type FirestoreError, type QuerySnapshot } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";

interface DataContextType {
  appData: AppData;
  loadingData: boolean;
  addUrinaryLog: (log: Omit<UrinaryLogEntry, 'id' | 'date'> & { date: Date }) => Promise<void>;
  addErectileLog: (log: Omit<ErectileLogEntry, 'id' | 'date'> & { date: Date }) => Promise<void>;
  addPSALog: (log: Omit<PSALogEntry, 'id' | 'date'> & { date: Date }) => Promise<void>;
  updateErectileLog: (id: string, log: Omit<ErectileLogEntry, 'id' | 'date'> & { date: Date }) => Promise<void>;
  updateUrinaryLog: (id: string, log: Omit<UrinaryLogEntry, 'id' | 'date'> & { date: Date }) => Promise<void>;
  updatePSALog: (id: string, log: Omit<PSALogEntry, 'id' | 'date'> & { date: Date }) => Promise<void>;
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
    let description = `Não foi possível carregar os dados de '${collectionName}'.`;

    if (error.code === 'permission-denied') {
      description = `Acesso negado para buscar dados de '${collectionName}'. A causa é quase sempre as Regras de Segurança do Firestore. Verifique suas regras no Console do Firebase.`;
    } else if (error.code === 'unauthenticated') {
      description = `Usuário não autenticado para buscar dados de '${collectionName}'.`;
    } else if (error.code === 'invalid-argument') {
      description = `Requisição inválida para '${collectionName}'. Isso pode ser um sinal de que as credenciais do Firebase (API Key, Project ID) no seu arquivo .env.local estão incorretas.`;
    } else if (error.code === 'unavailable' || (error.message && error.message.toLowerCase().includes('client is offline'))) {
      description = `Falha ao buscar dados de '${collectionName}'. O erro é 'client is offline', o que quase sempre indica um problema de **Regras de Segurança do Firestore**. Verifique se você aplicou o conteúdo do arquivo 'firestore.rules' no seu projeto do Firebase.`;
    }
    toast({
      title: "Erro de Conexão com o Banco de Dados",
      description,
      variant: "destructive",
      duration: 10000
    });
  }, [toast]);

  useEffect(() => {
    if (!user || !user.uid) {
      setAppData({ urinaryLogs: [], erectileLogs: [], psaLogs: [] });
      setLoadingData(false);
      return;
    }
    setLoadingData(true);

    console.log('[DEBUG] Usuário para Listen:', { uid: user.uid, email: user.email });
    
    const collectionsToSubscribe: { key: keyof AppData; path: string; name: string }[] = [
      { key: 'urinaryLogs', path: 'urinary_logs', name: 'sintomas urinários' },
      { key: 'erectileLogs', path: 'erectile_logs', name: 'função erétil' },
      { key: 'psaLogs', path: 'psa_logs', name: 'resultados PSA' },
    ];

    const initialLoads = new Set<string>();
    const totalListeners = collectionsToSubscribe.length;

    const unsubscribes = collectionsToSubscribe.map(({ key, path, name }) => {
      console.log(`Construindo consulta para o caminho: urotrak/${user.uid}/${path}`); 
      const q = query(collection(db, 'urotrak', user.uid, path));
      
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
          const items = snapshot.docs.map((doc) => {
            const data = doc.data();
            // Se o campo 'date' existir e for um Timestamp, converta-o.
            // Senão, use null ou a data atual como um valor padrão.
            const date = data.date && typeof data.date.toDate === 'function' 
              ? (data.date as Timestamp).toDate().toISOString() 
              : new Date().toISOString(); // Ou null
          
            return {
              id: doc.id,
              ...data,
              date, // Usa a data processada e segura
            };
          });
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
      await addDoc(collection(db, 'urotrak', user.uid, collectionName), logWithTimestamp);
    } catch (error) {
      console.error(`Error adding ${collectionName} log: `, error);
      throw error;
    }
  };

  const updateLog = async <T extends { date: Date }>(collectionName: string, id: string, log: Omit<T, 'id'>) => {
    if (!user) {
        console.error("User not logged in to update data.");
        throw new Error("Usuário não autenticado. Não é possível atualizar os dados.");
    }
    try {
        const logWithTimestamp = { ...log, date: Timestamp.fromDate(log.date) };
        const docRef = doc(db, 'urotrak', user.uid, collectionName, id);
        await updateDoc(docRef, logWithTimestamp);
    } catch (error) {
        console.error(`Error updating ${collectionName} log: `, error);
        throw error;
    }
  };

  const addUrinaryLog = (log: Omit<UrinaryLogEntry, 'id' | 'date'> & { date: Date }) => addLog('urinary_logs', log);

  const addErectileLog = (log: Omit<ErectileLogEntry, 'id' | 'date'> & { date: Date }) => addLog('erectile_logs', log);

  const addPSALog = (log: Omit<PSALogEntry, 'id' | 'date'> & { date: Date }) => addLog('psa_logs', log);

  const updateUrinaryLog = (id: string, log: Omit<UrinaryLogEntry, 'id' | 'date'> & { date: Date }) => updateLog('urinary_logs', id, log);

  const updateErectileLog = (id: string, log: Omit<ErectileLogEntry, 'id' | 'date'> & { date: Date }) => updateLog('erectile_logs', id, log);

  const updatePSALog = (id: string, log: Omit<PSALogEntry, 'id' | 'date'> & { date: Date }) => updateLog('psa_logs', id, log);


  return (
    <DataContext.Provider value={{ appData, loadingData, addUrinaryLog, addErectileLog, addPSALog,updateUrinaryLog, updateErectileLog, updatePSALog }}>
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
