
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
      setLoadingData(false);
      return;
    }

    setLoadingData(true);

    const handleSnapshot = (snapshot: QuerySnapshot, key: keyof AppData) => {
      const items = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: (data.date as Timestamp).toDate().toISOString(),
        };
      });
      setAppData(prevData => ({ ...prevData, [key]: items }));
    };

    const handleError = (error: FirestoreError, collectionName: string) => {
      console.error(`Error fetching ${collectionName}: `, error);
      let description = `Não foi possível carregar os dados de ${collectionName}.`;
      if (error.code === 'permission-denied') {
        description = `Acesso negado ao carregar ${collectionName}. Verifique as regras de segurança do Firestore.`;
      } else if (error.code === 'unavailable' || (error.message && error.message.toLowerCase().includes('client is offline'))) {
         description = `Não foi possível carregar ${collectionName}. Verifique sua conexão com a internet ou as permissões do Firestore.`;
      }
      toast({ title: "Erro ao buscar dados", description, variant: "destructive" });
    };
    
    const urinaryQuery = query(collection(db, 'users', user.uid, 'urinary_logs'), orderBy('date', 'desc'));
    const erectileQuery = query(collection(db, 'users', user.uid, 'erectile_logs'), orderBy('date', 'desc'));
    const psaQuery = query(collection(db, 'users', user.uid, 'psa_logs'), orderBy('date', 'desc'));

    const unsubUrinary = onSnapshot(urinaryQuery, (snapshot) => handleSnapshot(snapshot, 'urinaryLogs'), (error) => handleError(error, 'sintomas urinários'));
    const unsubErectile = onSnapshot(erectileQuery, (snapshot) => handleSnapshot(snapshot, 'erectileLogs'), (error) => handleError(error, 'função erétil'));
    const unsubPSA = onSnapshot(psaQuery, (snapshot) => handleSnapshot(snapshot, 'psaLogs'), (error) => handleError(error, 'resultados PSA'));

    setLoadingData(false);

    return () => {
      unsubUrinary();
      unsubErectile();
      unsubPSA();
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
