'use client';

import { useEffect, useState, useContext, createContext } from 'react';
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
}

const UserContext = createContext<UserContextType>({ user: null, loading: true });

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const { app, db } = useFirebase();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!app || !db) {
      // Firebase might not be initialized yet
      return;
    }

    const auth = getAuth(app);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (firebaseUser) {
        // User is signed in. Fetch custom user data from Firestore.
        const userDocRef = doc(db as Firestore, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          setUser({
            // Firebase Auth data
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            // Firestore data
            ...userDoc.data(),
          });
        } else {
          // This might happen if the user record in Firestore is not created yet
          // or was deleted. We'll set the basic auth info.
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
          });
        }
      } else {
        // User is signed out.
        setUser(null);
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [app, db]);

  return (
    <UserContext.Provider value={{ user, loading }}>
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
