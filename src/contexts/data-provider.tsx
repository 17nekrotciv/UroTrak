"use client";

import { getFunctions, httpsCallable } from "firebase/functions";
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { UrinaryLogEntry, ErectileLogEntry, PSALogEntry, AppData, UserProfile, Clinic } from '@/types';
import { useAuth } from './auth-provider';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, getDoc, updateDoc, query, orderBy, Timestamp, onSnapshot, type FirestoreError, type QuerySnapshot, deleteDoc, where } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";


interface DataContextType {
  appData: AppData;
  loadingData: boolean;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  createPatientAccount: (data: Omit<UserProfile, 'uid' | 'role' | 'clinicId'> & { password?: string }) => Promise<void>;
  updateClinicInfo: (data: Partial<Clinic>) => Promise<void>;

  addUrinaryLog: (log: Omit<UrinaryLogEntry, 'id' | 'date'> & { date: Date }, userId?: string) => Promise<void>;
  updateUrinaryLog: (id: string, log: Omit<UrinaryLogEntry, 'id' | 'date'> & { date: Date }, userId?: string) => Promise<void>;
  deleteUrinaryLog: (id: string, userId?: string) => Promise<void>;

  addErectileLog: (log: Omit<ErectileLogEntry, 'id' | 'date'> & { date: Date }, userId?: string) => Promise<void>;
  updateErectileLog: (id: string, log: Omit<ErectileLogEntry, 'id' | 'date'> & { date: Date }, userId?: string) => Promise<void>;
  deleteErectileLog: (id: string, userId?: string) => Promise<void>;

  addPSALog: (log: Omit<PSALogEntry, 'id' | 'date'> & { date: Date }, userId?: string) => Promise<void>;
  updatePSALog: (id: string, log: Omit<PSALogEntry, 'id' | 'date'> & { date: Date }, userId?: string) => Promise<void>;
  deletePSALog: (id: string, userId?: string) => Promise<void>;
  updateUserInfo: (log: Partial<Omit<UserProfile, 'uid'>>) => Promise<void>
  userProfile: UserProfile | null;
  clinicDoctorProfile: UserProfile | null;
  clinicUsers: UserProfile[];
  loadingClinicUsers: boolean;
  loadViewedUserData: (userId: string) => () => void;
  viewedUserData: AppData | null;
  loadingViewedUser: boolean;
  viewedUserProfile: UserProfile | null;
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
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [clinicDoctorProfile, setClinicDoctorProfile] = useState<UserProfile | null>(null);
  const [clinicUsers, setClinicUsers] = useState<UserProfile[]>([]);
  const [loadingClinicUsers, setLoadingClinicUsers] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [viewedUserData, setViewedUserData] = useState<AppData | null>(null);
  const [loadingViewedUser, setLoadingViewedUser] = useState(true);
  const [viewedUserProfile, setViewedUserProfile] = useState<UserProfile | null>(null);

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

    const collectionsToSubscribe: { key: keyof AppData; path: string; name: string }[] = [
      { key: 'urinaryLogs', path: 'urinary_logs', name: 'sintomas urinários' },
      { key: 'erectileLogs', path: 'erectile_logs', name: 'função erétil' },
      { key: 'psaLogs', path: 'psa_logs', name: 'resultados PSA' },
    ];

    const initialLoads = new Set<string>();
    const totalListeners = collectionsToSubscribe.length;

    const unsubscribes = collectionsToSubscribe.map(({ key, path, name }) => {
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
            const date = data.date && typeof data.date.toDate === 'function'
              ? (data.date as Timestamp).toDate().toISOString()
              : new Date().toISOString();

            return {
              id: doc.id,
              ...data,
              date,
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

  useEffect(() => {
    if (!userProfile || userProfile.role !== 'doctor' || !userProfile.clinicId) {
      setClinicUsers([]);
      setLoadingClinicUsers(false);
      return;
    }

    setLoadingClinicUsers(true);

    const usersQuery = query(
      collection(db, 'users'),
      where('clinicId', '==', userProfile.clinicId)
    );

    const unsubscribe = onSnapshot(usersQuery,
      (snapshot: QuerySnapshot) => {
        const usersList = snapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        })) as UserProfile[];

        const filteredList = usersList.filter(user => user.uid !== userProfile.uid);

        setClinicUsers(filteredList);
        setLoadingClinicUsers(false);
      },
      (error: FirestoreError) => {
        console.error("Erro ao buscar usuários da clínica:", error);
        handleError(error, 'lista de usuários da clínica');
        setLoadingClinicUsers(false);
      }
    );

    return () => unsubscribe();
  }, [userProfile, handleError]);


  useEffect(() => {
    if (!user || !user.uid) {
      setUserProfile(null);
      setClinicDoctorProfile(null);
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userDocRef, async (userDoc) => {
      if (!userDoc.exists()) {
        setUserProfile(null);
        setClinicDoctorProfile(null);
        console.warn("❌ Documento do usuário não encontrado!");
        return;
      }

      const userData = { uid: userDoc.id, ...userDoc.data() } as UserProfile;

      if (userData.clinicId && typeof userData.clinicId === 'string') {
        const clinicDocRef = doc(db, 'clinic', userData.clinicId);
        const clinicDoc = await getDoc(clinicDocRef);

        if (clinicDoc.exists()) {
          const clinicData = clinicDoc.data() as Clinic;
          const finalProfile = { ...userData, clinic: clinicData };
          setUserProfile(finalProfile);

          if (finalProfile.role === 'user' && clinicData.ownerId) {
            const doctorDocRef = doc(db, 'users', clinicData.ownerId);
            const doctorDoc = await getDoc(doctorDocRef);
            if (doctorDoc.exists()) {
              const doctorData = { uid: doctorDoc.id, ...doctorDoc.data() } as UserProfile;
              setClinicDoctorProfile(doctorData);
            } else {
              setClinicDoctorProfile(null);
            }
          } else {
            setClinicDoctorProfile(null);
          }

        } else {
          setUserProfile(userData);
          setClinicDoctorProfile(null);
        }
      } else {
        setUserProfile(userData);
        setClinicDoctorProfile(null);
      }
    },
      (error: FirestoreError) => {
        console.error("🚨 Erro GERAL no listener do usuário: ", error);
        handleError(error, 'perfil do usuário');
      });

    return () => unsubscribeUser();
  }, [user, handleError]);

  const loadViewedUserData = useCallback((userId: string) => {
    setLoadingViewedUser(true);

    const collectionsToSubscribe: { key: keyof AppData; path: string; name: string }[] = [
      { key: 'urinaryLogs', path: 'urinary_logs', name: 'sintomas urinários' },
      { key: 'erectileLogs', path: 'erectile_logs', name: 'função erétil' },
      { key: 'psaLogs', path: 'psa_logs', name: 'resultados PSA' },
    ];

    const userDocRef = doc(db, 'users', userId);
    const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setViewedUserProfile({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
      } else {
        setViewedUserProfile(null);
      }
    });

    const dataUnsubscribes = collectionsToSubscribe.map(({ key, path, name }) => {
      const q = query(collection(db, 'urotrak', userId, path));
      return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          date: (doc.data().date as Timestamp).toDate().toISOString(),
        }));
        setViewedUserData(prev => ({ ...prev, [key]: items } as AppData));
      }, (error: FirestoreError) => handleError(error, name));
    });

    setTimeout(() => setLoadingViewedUser(false), 1500);

    return () => {
      unsubscribeUser();
      dataUnsubscribes.forEach(unsub => unsub());
    };
  }, [handleError]);

  const addLog = async <T extends { date: Date }>(userId: string, collectionName: string, log: Omit<T, 'id'>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const logWithTimestamp = { ...log, date: Timestamp.fromDate(log.date) };
    await addDoc(collection(db, 'urotrak', userId, collectionName), logWithTimestamp);
  };

  const updateLog = async <T extends { date: Date }>(userId: string, collectionName: string, id: string, log: Omit<T, 'id'>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const logWithTimestamp = { ...log, date: Timestamp.fromDate(log.date) };
    const docRef = doc(db, 'urotrak', userId, collectionName, id);
    await updateDoc(docRef, logWithTimestamp);
  };

  const deleteLog = async (userId: string, collectionName: string, id: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const docRef = doc(db, 'urotrak', userId, collectionName, id);
    await deleteDoc(docRef);
  };

  const updateClinicInfo = async (data: Partial<Clinic>) => {
    if (!userProfile?.clinic?.ownerId || !userProfile?.clinicId) throw new Error("Dados da clínica não encontrados.");
    if (userProfile.uid !== userProfile.clinic.ownerId) throw new Error("Apenas o dono da clínica pode alterar informações.");
    const clinicRef = doc(db, 'clinic', userProfile.clinicId);
    await updateDoc(clinicRef, data);
  };

  const updateUserInfo = async (log: Partial<Omit<UserProfile, 'uid'>>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, { ...log, lastUpdatedAt: Timestamp.now() });
    toast({ title: "Sucesso!", description: "Suas informações foram salvas." });
  };

  const addUrinaryLog = (log: Omit<UrinaryLogEntry, 'id' | 'date'> & { date: Date }, userId?: string) => {
    const finalUserId = userId || user?.uid;
    if (!finalUserId) return Promise.reject(new Error("Usuário não autenticado."));
    return addLog(finalUserId, 'urinary_logs', log);
  };

  const updateUrinaryLog = (id: string, log: Omit<UrinaryLogEntry, 'id' | 'date'> & { date: Date }, userId?: string) => {
    const finalUserId = userId || user?.uid;
    if (!finalUserId) return Promise.reject(new Error("Usuário não autenticado."));
    return updateLog(finalUserId, 'urinary_logs', id, log);
  };

  const deleteUrinaryLog = (id: string, userId?: string) => {
    const finalUserId = userId || user?.uid;
    if (!finalUserId) return Promise.reject(new Error("Usuário não autenticado."));
    return deleteLog(finalUserId, 'urinary_logs', id);
  };

  const addErectileLog = (log: Omit<ErectileLogEntry, 'id' | 'date'> & { date: Date }, userId?: string) => {
    const finalUserId = userId || user?.uid;
    if (!finalUserId) return Promise.reject(new Error("Usuário não autenticado."));
    return addLog(finalUserId, 'erectile_logs', log);
  };

  const updateErectileLog = (id: string, log: Omit<ErectileLogEntry, 'id' | 'date'> & { date: Date }, userId?: string) => {
    const finalUserId = userId || user?.uid;
    if (!finalUserId) return Promise.reject(new Error("Usuário não autenticado."));
    return updateLog(finalUserId, 'erectile_logs', id, log);
  };

  const deleteErectileLog = (id: string, userId?: string) => {
    const finalUserId = userId || user?.uid;
    if (!finalUserId) return Promise.reject(new Error("Usuário não autenticado."));
    return deleteLog(finalUserId, 'erectile_logs', id);
  };

  const addPSALog = (log: Omit<PSALogEntry, 'id' | 'date'> & { date: Date }, userId?: string) => {
    const finalUserId = userId || user?.uid;
    if (!finalUserId) return Promise.reject(new Error("Usuário não autenticado."));
    return addLog(finalUserId, 'psa_logs', log);
  };

  const updatePSALog = (id: string, log: Omit<PSALogEntry, 'id' | 'date'> & { date: Date }, userId?: string) => {
    const finalUserId = userId || user?.uid;
    if (!finalUserId) return Promise.reject(new Error("Usuário não autenticado."));
    return updateLog(finalUserId, 'psa_logs', id, log);
  };

  const deletePSALog = (id: string, userId?: string) => {
    const finalUserId = userId || user?.uid;
    if (!finalUserId) return Promise.reject(new Error("Usuário não autenticado."));
    return deleteLog(finalUserId, 'psa_logs', id);
  };

  const createPatientAccount = async (data: Omit<UserProfile, 'uid' | 'role' | 'clinicId'> & { password?: string }) => {
    if (userProfile?.role !== 'doctor' || !userProfile.clinicId) {
      throw new Error("Apenas médicos autenticados podem criar contas de pacientes.");
    }
    const functions = getFunctions();
    const createPatientUser = httpsCallable(functions, 'createPatientUser');
    try {
      const result = await createPatientUser({ ...data, clinicId: userProfile.clinicId });
      const resultData = result.data as { success: boolean, message: string };
      if (!resultData.success) throw new Error(resultData.message || "A Cloud Function retornou um erro.");
    } catch (error) {
      console.error("Erro ao chamar a Cloud Function 'createPatientUser':", error);
      if (error instanceof Error && error.message.includes('already-exists')) {
        throw new Error("Este email já está cadastrado no sistema.");
      }
      throw new Error("Não foi possível criar a conta do paciente.");
    }
  };

  return (
    <DataContext.Provider value={
      {
        appData, loadingData, userProfile, setUserProfile, createPatientAccount, updateClinicInfo,
        clinicDoctorProfile,
        addUrinaryLog, addErectileLog, addPSALog, updateUrinaryLog, updateErectileLog,
        updatePSALog, deleteUrinaryLog, deleteErectileLog, deletePSALog, updateUserInfo,
        clinicUsers, loadingClinicUsers, loadViewedUserData, viewedUserData, loadingViewedUser, viewedUserProfile
      }
    }>
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
}