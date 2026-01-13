
'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect, useCallback } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseStorage } from 'firebase/storage';
import { UserProfile } from '@/lib/types';

interface UserData extends User, Partial<UserProfile> {
    [key: string]: any;
}
interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  storage: FirebaseStorage;
}

interface UserAuthState {
  user: UserData | null;
  isUserLoading: boolean;
  userError: Error | null;
  refresh: () => void;
}

export interface FirebaseContextState {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  storage: FirebaseStorage;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

export const useFirebase = (): FirebaseContextState & { db: Firestore } => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase deve ser usado dentro de um FirebaseProvider.');
  }
  return { ...context, db: context.firestore };
};

export const useAuth = (): Auth => {
  const { auth } = useFirebase();
  if (!auth) throw new Error("Serviço de autenticação não disponível.");
  return auth;
};

export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  if (!firestore) throw new Error("Serviço do Firestore não disponível.");
  return firestore;
};

export const useStorage = (): FirebaseStorage => {
  const { storage } = useFirebase();
  if (!storage) throw new Error("Serviço de armazenamento não disponível.");
  return storage;
};

export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  if (!firebaseApp) throw new Error("FirebaseApp não disponível.");
  return firebaseApp;
};

const UserContext = createContext<UserAuthState | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { auth, firestore } = useFirebase();
  const [userState, setUserState] = useState<Omit<UserAuthState, 'refresh'>>({
    user: null,
    isUserLoading: true,
    userError: null,
  });

  const fetchExtraData = useCallback(async (firebaseUser: User | null): Promise<UserData | null> => {
    if (!firebaseUser) return null;
    if (!firestore) return firebaseUser as UserData;

    try {
        const userDocRef = doc(firestore, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
            return { ...firebaseUser, ...userDoc.data() } as UserData;
        } else {
             // O documento não existe, então vamos criar um básico.
            console.warn(`Documento do usuário para ${firebaseUser.uid} não encontrado. Recriando...`);
            const newUserProfileData: Omit<UserProfile, 'cpf' | 'cep' | 'street' | 'number' | 'neighborhood' | 'city' | 'state'> = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                displayName: firebaseUser.displayName || 'Usuário',
                photoURL: firebaseUser.photoURL || '',
                role: 'customer', // Papel padrão
            };
            await setDoc(userDocRef, { ...newUserProfileData });
            return { ...firebaseUser, ...newUserProfileData } as UserData;
        }
    } catch (error) {
        console.error("Erro ao buscar ou criar dados do usuário no Firestore:", error);
        return firebaseUser as UserData; // Retorna usuário básico de autenticação em caso de erro
    }
  }, [firestore]);
  
  const refresh = useCallback(async () => {
    setUserState(s => ({ ...s, isUserLoading: true }));
    const refreshedUser = await fetchExtraData(auth.currentUser);
    setUserState(s => ({ ...s, user: refreshedUser, isUserLoading: false }));
  }, [auth, fetchExtraData]);

  useEffect(() => {
    if (!auth) {
      setUserState({ user: null, isUserLoading: false, userError: new Error("Serviço de autenticação não disponível.") });
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUserState(s => ({ ...s, isUserLoading: true }));
      const userData = await fetchExtraData(firebaseUser);
      setUserState({ user: userData, isUserLoading: false, userError: null });
    }, (error) => {
      console.error("Erro na mudança de estado de autenticação:", error);
      setUserState({ user: null, isUserLoading: false, userError: error });
    });

    return () => unsubscribe();
  }, [auth, fetchExtraData]);

  const providerValue = useMemo(() => ({ ...userState, refresh }), [userState, refresh]);

  return (
    <UserContext.Provider value={providerValue}>
      {children}
    </UserContext.Provider>
  );
};


export const useUser = (): UserAuthState => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser deve ser usado dentro de um UserProvider.');
  }
  return context;
};


export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
  storage,
}) => {
  const contextValue = useMemo((): FirebaseContextState => ({
    firebaseApp,
    firestore,
    auth,
    storage,
  }), [firebaseApp, firestore, auth, storage]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      {children}
    </FirebaseContext.Provider>
  );
};

type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  
  return memoized;
}
