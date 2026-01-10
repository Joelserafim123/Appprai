'use client';

import { initializeFirebase } from '.';
import { FirebaseProvider } from './provider';
import { UserProvider } from './auth/use-user';

// This provider is responsible for initializing Firebase on the client side.
// It should be used as a wrapper around the root layout of your application.
export function FirebaseClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { app, db, auth } = initializeFirebase();

  return (
    <FirebaseProvider app={app} db={db} auth={auth}>
      <UserProvider>{children}</UserProvider>
    </FirebaseProvider>
  );
}
