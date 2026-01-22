'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect, useCallback } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, getDoc } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { FirebaseStorage } from 'firebase/storage';
import { UserProfile } from '@/lib/types';
import { errorEmitter } from './error-emitter';
import { FirestorePermissionError } from './errors';

interface UserData extends User, Partial<UserProfile> {
    [key: string]: any;
    profileComplete?: boolean;
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
    if (!firebaseUser || !firestore) return firebaseUser as UserData | null;

    if (firebaseUser.isAnonymous) {
      return firebaseUser as UserData;
    }

    const userDocRef = doc(firestore, 'users', firebaseUser.uid);
    
    return getDoc(userDocRef).then((userDoc) => {
        if (userDoc.exists()) {
            const profileData = userDoc.data() as UserProfile;
            const isComplete = !!(profileData.displayName && profileData.cpf);
            return { ...firebaseUser, ...profileData, profileComplete: isComplete } as UserData;
        } else {
            console.warn(`User document for ${firebaseUser.uid} not found. Profile is incomplete.`);
            const partialProfile: Partial<UserProfile> = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                displayName: firebaseUser.displayName || 'User',
                photoURL: firebaseUser.photoURL || '',
            };
            return { ...firebaseUser, ...partialProfile, profileComplete: false } as UserData;
        }
    }).catch(error => {
        const permissionError = new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'get',
        });
        errorEmitter.emit('permission-error', permissionError);
        return { ...firebaseUser, profileComplete: false } as UserData;
    });
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
      if (firebaseUser) {
        setUserState(s => ({ ...s, isUserLoading: true }));
        const userData = await fetchExtraData(firebaseUser);
        setUserState({ user: userData, isUserLoading: false, userError: null });
      } else {
        signInAnonymously(auth).catch((error) => {
          console.error("Anonymous sign-in failed:", error);
          setUserState({ user: null, isUserLoading: false, userError: error });
        });
      }
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

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoized = useMemo(factory, deps);
  
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  
  return memoized as T;
}
