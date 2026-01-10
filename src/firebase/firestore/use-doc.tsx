'use client';
import { useState, useEffect, useMemo } from 'react';
import {
  doc,
  onSnapshot,
  DocumentReference,
  DocumentData,
  FirestoreError,
  DocumentSnapshot,
} from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface UseDocResult<T> {
  data: T | null;
  loading: boolean;
  error: FirestoreError | null;
}

/**
 * A hook for subscribing to a Firestore document in real-time.
 * @param docRef The Firestore document reference.
 * @returns An object containing the document data, loading state, and error.
 */
export function useDoc<T>(
  docRef: DocumentReference | null | undefined
): UseDocResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | null>(null);
  
  // Memoize the docRef to prevent re-renders from creating new objects.
  const memoizedDocRef = useMemo(() => docRef, [docRef]);

  useEffect(() => {
    if (!memoizedDocRef) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe = onSnapshot(
      memoizedDocRef,
      (snapshot: DocumentSnapshot<DocumentData>) => {
        if (snapshot.exists()) {
          setData({ id: snapshot.id, ...snapshot.data() } as T);
        } else {
          setData(null); // Document does not exist
        }
        setLoading(false);
        setError(null);
      },
      (err: FirestoreError) => {
        console.error('useDoc error:', err);
        setError(err);
        setLoading(false);

        // Emit a specific permission error if that's the cause
        if (err.code === 'permission-denied') {
             const permissionError = new FirestorePermissionError({
                path: memoizedDocRef.path,
                operation: 'get',
            });
            errorEmitter.emit('permission-error', permissionError);
        }
      }
    );

    return () => unsubscribe();
  }, [memoizedDocRef]);

  return { data, loading, error };
}

/**
 * A hook for creating a memoized Firestore document reference.
 * Prevents infinite loops in useEffects that depend on the doc ref.
 * @param path The path to the document.
 * @param pathSegments Additional path segments.
 * @returns A memoized Firestore document reference.
 */
export const useMemoizedDoc = (path: string, ...pathSegments: string[]) => {
  const { db } = useFirebase();
  return useMemo(() => {
    if (!db) return null;
    // The path to doc must contain an even number of segments.
    if ((path.split('/').length + pathSegments.length) % 2 !== 0) {
        console.warn(`Invalid document path provided to useMemoizedDoc: ${path}/${pathSegments.join('/')}`);
        return null;
    }
    return doc(db, path, ...pathSegments);
  }, [db, path, ...pathSegments]);
};
