'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect, useCallback } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, getDoc } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import type { UserProfile } from '@/lib/types';


// Combined type for the hydrated user
export interface UserData extends User, UserProfile {}

// Interfaces for contexts
interface FirebaseContextState {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

interface UserContextType {
  user: UserData | null;
  isUserLoading: boolean;
  userError: Error | null;
  refresh: () => Promise<void>;
}

// Contexts
const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);
const UserContext = createContext<UserContextType | undefined>(undefined);

// Provider for core Firebase services
export const FirebaseProvider: React.FC<{ children: ReactNode; firebaseApp: FirebaseApp; firestore: Firestore; auth: Auth; }> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const contextValue = useMemo(() => ({
    firebaseApp,
    firestore,
    auth,
  }), [firebaseApp, firestore, auth]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      {children}
    </FirebaseContext.Provider>
  );
};


// Provider for the hydrated user object
export function UserProvider({ children }: { children: ReactNode }) {
    const { auth, firestore } = useFirebase();
    const [user, setUser] = useState<UserData | null>(null);
    const [isUserLoading, setIsUserLoading] = useState(true);
    const [userError, setUserError] = useState<Error | null>(null);

    const fetchUserProfile = useCallback(async (firebaseUser: User): Promise<UserData> => {
        if (!firestore) throw new Error("Firestore not available");
        const userDocRef = doc(firestore, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const userProfile = userDoc.data() as UserProfile;
            return { ...firebaseUser, ...userProfile };
        } else {
            return {
                ...firebaseUser,
                uid: firebaseUser.uid,
                email: firebaseUser.email!,
                displayName: firebaseUser.displayName!,
                role: 'customer',
                profileComplete: false,
            } as UserData;
        }
    }, [firestore]);
    
    useEffect(() => {
        if (!auth) {
            setIsUserLoading(false);
            return;
        };

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                 try {
                    const fullUserData = await fetchUserProfile(firebaseUser);
                    setUser(fullUserData);
                } catch(e: any) {
                    setUserError(e);
                }
            } else {
                setUser(null);
            }
            setIsUserLoading(false);
        }, (error) => {
            console.error("Auth state error:", error);
            setUserError(error);
            setIsUserLoading(false);
        });

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
                console.error("Error refreshing user:", e);
                setUserError(e);
            }
            setIsUserLoading(false);
        }
    }, [auth, fetchUserProfile]);

    const value = { user, isUserLoading, userError, refresh };

    return (
        <UserContext.Provider value={value}>
             <FirebaseErrorListener />
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

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T {
  const memoized = useMemo(factory, deps);
  if(typeof memoized === 'object' && memoized !== null) {
    (memoized as any).__memo = true;
  }
  return memoized;
}
