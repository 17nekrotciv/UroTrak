
// src/contexts/data-provider.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { UrinaryLogEntry, ErectileLogEntry, PSALogEntry, AppData } from '@/types';
import { useAuth } from './auth-provider';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, doc, setDoc, deleteDoc, Timestamp, onSnapshot, FirestoreError } from 'firebase/firestore';
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
      return; // No user, so no listeners to set up.
    }

    setLoadingData(true);

    const setupListener = (collectionName: string, stateKey: keyof AppData) => {
      const q = query(collection(db, 'users', user.uid, collectionName), orderBy('date', 'desc'));
      
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const items: any[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          items.push({ 
            id: doc.id, 
            ...data,
            // Ensure date is always converted to ISO string for consistency
            date: (data.date as Timestamp).toDate().toISOString()
          });
        });
        setAppData(prevData => ({ ...prevData, [stateKey]: items }));
        setLoadingData(false); // Data for this collection has loaded
      }, (error: FirestoreError) => {
        console.error(`Error fetching ${collectionName}: `, error);
        let description = `Não foi possível carregar os dados de ${collectionName}.`;
        if (error.code === 'permission-denied') {
          description = `Acesso negado ao carregar ${collectionName}. Verifique as regras de segurança do Firestore.`;
        } else if (error.code === 'unavailable' || (error.message && error.message.toLowerCase().includes('client is offline'))) {
           description = `Não foi possível carregar ${collectionName}. Verifique sua conexão com a internet ou as permissões do Firestore.`;
        }
        toast({ title: "Erro ao buscar dados", description, variant: "destructive" });
        setLoadingData(false);
      });

      return unsubscribe; // Return the cleanup function
    };

    // Set up listeners for all data types
    const unsubUrinary = setupListener('urinary_logs', 'urinaryLogs');
    const unsubErectile = setupListener('erectile_logs', 'erectileLogs');
    const unsubPSA = setupListener('psa_logs', 'psaLogs');

    // Return a cleanup function that will be called on unmount
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
