
'use client';

import { useEffect, useState, useContext, createContext, useCallback } from 'react';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, Firestore } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';

interface UserData {
  // Base user properties from Firebase Auth
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  // Custom properties from your Firestore 'users' collection
  [key: string]: any; 
}

interface UserContextType {
  user: UserData | null;
  loading: boolean;
  refresh?: () => void; // Add refresh function
}

const UserContext = createContext<UserContextType>({ user: null, loading: true });

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const { app, db } = useFirebase();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = useCallback(async (firebaseUser: User | null) => {
    if (firebaseUser && db) {
      try {
        const userDocRef = doc(db as Firestore, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);

        let userData: UserData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        };

        if (userDoc.exists()) {
          userData = { ...userData, ...userDoc.data() };
        }
        setUser(userData);
      } catch (error) {
        console.error("Error fetching user data from Firestore:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    } else {
      setUser(null);
      setLoading(false);
    }
  }, [db]);


  useEffect(() => {
    if (!app) {
      if (!loading) setLoading(true);
      return;
    }
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: User | null) => {
      setLoading(true);
      fetchUserData(firebaseUser);
    });

    return () => unsubscribe();
  }, [app, fetchUserData]);

  const refresh = useCallback(() => {
    const auth = getAuth(app!);
    fetchUserData(auth.currentUser);
  }, [app, fetchUserData]);


  return (
    <UserContext.Provider value={{ user, loading, refresh }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider.');
  }
  return context;
};
