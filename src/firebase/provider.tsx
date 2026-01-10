'use client';
import { createContext, useContext, ReactNode } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';

interface FirebaseContextType {
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
}

const FirebaseContext = createContext<FirebaseContextType>({
  app: null,
  auth: null,
  db: null,
});

export const FirebaseProvider = ({
  children,
  app,
  auth,
  db,
}: {
  children: ReactNode;
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
}) => {
  return (
    <FirebaseContext.Provider value={{ app, auth, db }}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};

export const useFirebaseApp = () => useFirebase().app;
export const useFirestore = () => useFirebase().db;
export const useAuth = () => useFirebase().auth;
