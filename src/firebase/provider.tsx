
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
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }
  return { ...context, db: context.firestore };
};

export const useAuth = (): Auth => {
  const { auth } = useFirebase();
  if (!auth) throw new Error("Auth service not available.");
  return auth;
};

export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  if (!firestore) throw new Error("Firestore service not available.");
  return firestore;
};

export const useStorage = (): FirebaseStorage => {
  const { storage } = useFirebase();
  if (!storage) throw new Error("Storage service not available.");
  return storage;
};

export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  if (!firebaseApp) throw new Error("FirebaseApp not available.");
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
             // The document doesn't exist, so let's create a basic one.
            console.warn(`User document for ${firebaseUser.uid} not found. Re-creating...`);
            const newUserProfileData: Omit<UserProfile, 'cpf' | 'cep' | 'street' | 'number' | 'neighborhood' | 'city' | 'state'> = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                displayName: firebaseUser.displayName || 'User',
                photoURL: firebaseUser.photoURL || '',
                role: 'customer', // Default role
            };
            await setDoc(userDocRef, { ...newUserProfileData });
            return { ...firebaseUser, ...newUserProfileData } as UserData;
        }
    } catch (error) {
        console.error("Error fetching or creating user data in Firestore:", error);
        return firebaseUser as UserData; // Return basic auth user on error
    }
  }, [firestore]);
  
  const refresh = useCallback(async () => {
    setUserState(s => ({ ...s, isUserLoading: true }));
    const refreshedUser = await fetchExtraData(auth.currentUser);
    setUserState(s => ({ ...s, user: refreshedUser, isUserLoading: false }));
  }, [auth, fetchExtraData]);

  useEffect(() => {
    if (!auth) {
      setUserState({ user: null, isUserLoading: false, userError: new Error("Auth service not available.") });
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUserState(s => ({ ...s, isUserLoading: true }));
      const userData = await fetchExtraData(firebaseUser);
      setUserState({ user: userData, isUserLoading: false, userError: null });
    }, (error) => {
      console.error("Auth state change error:", error);
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
    throw new Error('useUser must be used within a UserProvider.');
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
