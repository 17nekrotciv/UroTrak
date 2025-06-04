// src/contexts/data-provider.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { UrinaryLogEntry, ErectileLogEntry, PSALogEntry, AppData } from '@/types';
import { useAuth } from './auth-provider';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, doc, setDoc, deleteDoc, Timestamp, onSnapshot } from 'firebase/firestore';
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
  const { toast } = useToast(); // Toast ainda é usado para fetchData
  const [appData, setAppData] = useState<AppData>({
    urinaryLogs: [],
    erectileLogs: [],
    psaLogs: [],
  });
  const [loadingData, setLoadingData] = useState(true);

  const fetchData = useCallback(async (collectionName: string, userId: string) => {
    const q = query(collection(db, 'users', userId, collectionName), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const items: any[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        items.push({ 
          id: doc.id, 
          ...data,
          date: (data.date as Timestamp).toDate().toISOString()
        });
      });
      setAppData(prevData => ({
        ...prevData,
        [collectionName === 'urinary_logs' ? 'urinaryLogs' : 
         collectionName === 'erectile_logs' ? 'erectileLogs' : 
         'psaLogs']: items
      }));
      setLoadingData(false);
    }, (error) => {
      console.error(`Error fetching ${collectionName}: `, error);
      toast({ title: "Erro ao buscar dados", description: `Não foi possível carregar ${collectionName}.`, variant: "destructive" });
      setLoadingData(false);
    });
    return unsubscribe;
  }, [toast]);


  useEffect(() => {
    if (user) {
      setLoadingData(true);
      const unsubUrinary = fetchData('urinary_logs', user.uid);
      const unsubErectile = fetchData('erectile_logs', user.uid);
      const unsubPSA = fetchData('psa_logs', user.uid);
      
      return () => {
        unsubUrinary.then(unsub => unsub());
        unsubErectile.then(unsub => unsub());
        unsubPSA.then(unsub => unsub());
      };
    } else {
      setAppData({ urinaryLogs: [], erectileLogs: [], psaLogs: [] });
      setLoadingData(false);
    }
  }, [user, fetchData]);

  const addLog = async <T extends { date: Date }>(collectionName: string, log: Omit<T, 'id'> ) => {
    if (!user) {
      console.error("User not logged in to add data.");
      // Lançar erro para a página do formulário lidar, em vez de fazer toast aqui.
      throw new Error("Usuário não autenticado. Não é possível salvar os dados.");
    }
    try {
      const logWithTimestamp = { ...log, date: Timestamp.fromDate(log.date) };
      await addDoc(collection(db, 'users', user.uid, collectionName), logWithTimestamp);
      // Toast de sucesso será feito pela página do formulário (agregado).
    } catch (error) {
      console.error(`Error adding ${collectionName} log: `, error);
      // Lançar erro para a página do formulário lidar e fazer toast se necessário.
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
