import { getApps, initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

// This function initializes and returns a Firebase app instance.
// It is designed to be idempotent, so it can be safely called multiple times.
export const initializeFirebase = (): {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
} => {
  const apps = getApps();
  const app = apps.length ? apps[0] : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  return { app, auth, db };
};
