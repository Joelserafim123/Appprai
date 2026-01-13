
'use client';
    
import { useState, useEffect } from 'react';
import {
  DocumentReference,
  onSnapshot,
  DocumentData,
  FirestoreError,
  DocumentSnapshot,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/** Tipo utilitário para adicionar um campo 'id' a um tipo T. */
type WithId<T> = T & { id: string };

/**
 * Interface para o valor de retorno do hook useDoc.
 * @template T Tipo dos dados do documento.
 */
export interface UseDocResult<T> {
  data: WithId<T> | null; // Dados do documento com ID, ou nulo.
  isLoading: boolean;       // Verdadeiro se estiver carregando.
  error: FirestoreError | Error | null; // Objeto de erro, ou nulo.
}

/**
 * Hook do React para se inscrever em um único documento do Firestore em tempo real.
 * Lida com referências nulas.
 * 
 * IMPORTANTE! VOCÊ DEVE MEMOIZAR o memoizedTargetRefOrQuery de entrada ou COISAS RUINS ACONTECERÃO
 * use useMemo para memoizá-lo de acordo com a orientação do React. Certifique-se também de que suas dependências sejam referências estáveis
 *
 *
 * @template T Tipo opcional para dados do documento. O padrão é any.
 * @param {DocumentReference<DocumentData> | null | undefined} docRef -
 * A DocumentReference do Firestore. Aguarda se for nulo/indefinido.
 * @returns {UseDocResult<T>} Objeto com dados, isLoading, erro.
 */
export function useDoc<T = any>(
  memoizedDocRef: (DocumentReference<DocumentData> & {__memo?: boolean}) | null | undefined,
): UseDocResult<T> {
  type StateDataType = WithId<T> | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    if (!memoizedDocRef) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    // Opcional: setData(null); // Limpa dados anteriores instantaneamente

    const unsubscribe = onSnapshot(
      memoizedDocRef,
      (snapshot: DocumentSnapshot<DocumentData>) => {
        if (snapshot.exists()) {
          setData({ ...(snapshot.data() as T), id: snapshot.id });
        } else {
          // Documento não existe
          setData(null);
        }
        setError(null); // Limpa qualquer erro anterior em um snapshot bem-sucedido (mesmo que o doc não exista)
        setIsLoading(false);
      },
      (error: FirestoreError) => {
        const contextualError = new FirestorePermissionError({
          operation: 'get',
          path: memoizedDocRef.path,
        })

        setError(contextualError)
        setData(null)
        setIsLoading(false)

        // dispara a propagação global de erro
        errorEmitter.emit('permission-error', contextualError);
      }
    );

    return () => unsubscribe();
  }, [memoizedDocRef]); // Re-executa se o memoizedDocRef mudar.

  if(memoizedDocRef && !memoizedDocRef.__memo) {
    throw new Error('Uma referência passada para useDoc não foi devidamente memoizada usando useMemoFirebase');
  }
  return { data, isLoading, error };
}
