'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';

// This component is responsible for listening to Firestore permission errors
// and displaying them as toasts. It should be placed in your root layout.
export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = errorEmitter.on('permission-error', (error: FirestorePermissionError) => {
      console.error("Firestore Permission Error:", error.message, error.context);
      toast({
        variant: 'destructive',
        title: 'Erro de Permissão',
        description: error.message,
      });

      // For development, we can throw the error to see the stack trace in the Next.js overlay
      if (process.env.NODE_ENV === 'development') {
        throw error;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [toast]);

  return null;
}
