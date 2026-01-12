'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect, useCallback } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, getDoc } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';

interface UserData extends User {
    [key: string]: any;
}
interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

interface UserAuthState {
  user: UserData | null;
  isUserLoading: boolean;
  userError: Error | null;
  refresh: () => void;
}

export interface FirebaseContextState {
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  user: UserData | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

export const useFirebase = (): FirebaseContextState => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }
  return context;
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

export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  if (!firebaseApp) throw new Error("FirebaseApp not available.");
  return firebaseApp;
};

const UserContext = createContext<UserAuthState | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { auth, firestore } = useFirebase();
  const [userState, setUserState] = useState<UserAuthState>({
    user: null,
    isUserLoading: true,
    userError: null,
    refresh: () => {},
  });

  const fetchExtraData = useCallback(async (firebaseUser: User) => {
    if (firestore) {
      const userDocRef = doc(firestore, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        return { ...firebaseUser, ...userDoc.data() };
      }
    }
    return firebaseUser;
  }, [firestore]);
  
  const refresh = useCallback(async () => {
    if (auth?.currentUser) {
        setUserState(s => ({ ...s, isUserLoading: true }));
        const refreshedUser = await fetchExtraData(auth.currentUser);
        setUserState(s => ({ ...s, user: refreshedUser, isUserLoading: false }));
    }
  }, [auth, fetchExtraData]);

  useEffect(() => {
    if (!auth) {
      setUserState({ user: null, isUserLoading: false, userError: new Error("Auth service not available."), refresh: () => {} });
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUserState(s => ({ ...s, isUserLoading: true }));
        const userData = await fetchExtraData(firebaseUser);
        setUserState({ user: userData, isUserLoading: false, userError: null, refresh });
      } else {
        setUserState({ user: null, isUserLoading: false, userError: null, refresh });
      }
    }, (error) => {
      setUserState({ user: null, isUserLoading: false, userError: error, refresh });
    });

    return () => unsubscribe();
  }, [auth, fetchExtraData, refresh]);

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
}) => {
  const contextValue = useMemo((): FirebaseContextState => ({
    firebaseApp,
    firestore,
    auth,
    user: null, // User state will be managed by UserProvider
    isUserLoading: true,
    userError: null,
  }), [firebaseApp, firestore, auth]);

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
