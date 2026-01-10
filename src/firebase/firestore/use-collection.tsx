'use client';
import { useState, useEffect, useMemo } from 'react';
import {
  collection,
  query,
  onSnapshot,
  Query,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
} from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface UseCollectionResult<T> {
  data: T[] | null;
  loading: boolean;
  error: FirestoreError | null;
}

/**
 * A hook for subscribing to a Firestore collection in real-time.
 * @param query The Firestore query to execute.
 * @returns An object containing the collection data, loading state, and error.
 */
export function useCollection<T>(
  q: Query | null | undefined
): UseCollectionResult<T> {
  const { db } = useFirebase();
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  // Memoize the query to prevent re-renders from creating new query objects.
  const memoizedQuery = useMemo(() => q, [q]);

  useEffect(() => {
    if (!db || !memoizedQuery) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe = onSnapshot(
      memoizedQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const docs = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as T)
        );
        setData(docs);
        setLoading(false);
        setError(null);
      },
      (err: FirestoreError) => {
        console.error('useCollection error:', err);
        setError(err);
        setLoading(false);

        // Emit a specific permission error if that's the cause
        if (err.code === 'permission-denied') {
           const permissionError = new FirestorePermissionError({
                path: (memoizedQuery as any)._path?.toString() || 'unknown path', // Internal but useful
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
        }
      }
    );

    return () => unsubscribe();
  }, [db, memoizedQuery]);

  return { data, loading, error };
}

/**
 * A hook for creating a memoized Firestore collection reference.
 * Prevents infinite loops in useEffects that depend on the collection ref.
 * @param path The path to the collection.
 * @param pathSegments Additional path segments.
 * @returns A memoized Firestore collection reference.
 */
export const useMemoizedCollection = (path: string, ...pathSegments: string[]) => {
  const { db } = useFirebase();
  return useMemo(() => {
    if (!db) return null;
    return collection(db, path, ...pathSegments);
  }, [db, path, ...pathSegments]);
};
