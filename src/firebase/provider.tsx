'use client';

import React, {
  DependencyList,
  createContext,
  useContext,
  ReactNode,
  useMemo,
  useState,
  useEffect,
  useCallback,
} from 'react';
import {
  FirebaseApp,
  getApp,
  getApps,
  initializeApp,
} from 'firebase/app';
import {
  Firestore,
  doc,
  getDoc,
  getFirestore,
} from 'firebase/firestore';
import { Auth, User, getAuth, onAuthStateChanged } from 'firebase/auth';
import { FirebaseStorage, getStorage } from 'firebase/storage';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import type { UserProfile, UserData } from '@/lib/types';
import { firebaseConfig } from './config';
import { profileImageUrl } from '@/lib/placeholder-images';

export function initializeFirebase() {
  if (getApps().length) {
    return getSdks(getApp());
  }
  const firebaseApp = initializeApp(firebaseConfig);
  return getSdks(firebaseApp);
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
    storage: getStorage(firebaseApp),
  };
}

// Interfaces for contexts
interface FirebaseContextState {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  storage: FirebaseStorage;
}

interface UserContextType {
  user: UserData | null;
  isUserLoading: boolean;
  userError: Error | null;
  refresh: () => Promise<void>;
}

// Contexts
const FirebaseContext = createContext<FirebaseContextState | undefined>(
  undefined
);
const UserContext = createContext<UserContextType | undefined>(undefined);

// Provider for core Firebase services
export const FirebaseProvider: React.FC<{
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  storage: FirebaseStorage;
}> = ({ children, firebaseApp, firestore, auth, storage }) => {
  const contextValue = useMemo(
    () => ({
      firebaseApp,
      firestore,
      auth,
      storage,
    }),
    [firebaseApp, firestore, auth, storage]
  );

  return (
    <FirebaseContext.Provider value={contextValue}>
      <UserProvider>
         <FirebaseErrorListener />
         {children}
      </UserProvider>
    </FirebaseContext.Provider>
  );
};

// Provider for the hydrated user object
export function UserProvider({ children }: { children: ReactNode }) {
  const { auth, firestore } = useFirebase();
  const [user, setUser] = useState<UserData | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [userError, setUserError] = useState<Error | null>(null);

  const fetchUserProfile = useCallback(
    async (firebaseUser: User): Promise<UserData> => {
      if (!firestore) throw new Error('Firestore not available');
      const userDocRef = doc(firestore, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      const userProfile = userDoc.exists() ? (userDoc.data() as UserProfile) : null;
      
      const hydratedUser: UserData = {
          // Firebase Auth data
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || '',
          photoURL: profileImageUrl,
          emailVerified: firebaseUser.emailVerified,
          isAnonymous: firebaseUser.isAnonymous,
          // Firestore profile data (or defaults)
          role: userProfile?.role || 'customer',
          profileComplete: userProfile?.profileComplete || false,
          cpf: userProfile?.cpf,
          cep: userProfile?.cep,
          street: userProfile?.street,
          number: userProfile?.number,
          neighborhood: userProfile?.neighborhood,
          city: userProfile?.city,
          state: userProfile?.state,
          outstandingBalance: userProfile?.outstandingBalance || 0,
          favoriteTentIds: userProfile?.favoriteTentIds || [],
      };

      return hydratedUser;

    }, [firestore]
  );

  useEffect(() => {
    if (!auth) {
      setIsUserLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        setIsUserLoading(true);
        if (firebaseUser) {
          try {
            const fullUserData = await fetchUserProfile(firebaseUser);
            setUser(fullUserData);
          } catch (e: any) {
            setUserError(e);
            setUser(null);
          }
        } else {
          setUser(null);
        }
        setIsUserLoading(false);
      },
      (error) => {
        console.error('Auth state error:', error);
        setUserError(error);
        setIsUserLoading(false);
      }
    );

    return () => unsubscribe();
  }, [auth, fetchUserProfile]);

  const refresh = useCallback(async () => {
    if (auth?.currentUser) {
      setIsUserLoading(true);
      try {
        await auth.currentUser.reload();
        const fullUserData = await fetchUserProfile(auth.currentUser);
        setUser(fullUserData);
      } catch (e: any) {
        console.error('Error refreshing user:', e);
        setUserError(e);
      }
      setIsUserLoading(false);
    }
  }, [auth, fetchUserProfile]);

  const value = { user, isUserLoading, userError, refresh };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

// Hooks
export const useFirebase = (): FirebaseContextState => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }
  return context;
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider.');
  }
  return context;
};

export const useAuth = (): Auth => useFirebase().auth;
export const useFirestore = (): Firestore => useFirebase().firestore;
export const useFirebaseApp = (): FirebaseApp => useFirebase().firebaseApp;
export const useStorage = (): FirebaseStorage => useFirebase().storage;


export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T {
  return useMemo(factory, deps);
}
