
'use client';

import { useState, useEffect } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/** Tipo utilitário para adicionar um campo 'id' a um tipo T. */
export type WithId<T> = T & { id: string };

/**
 * Interface para o valor de retorno do hook useCollection.
 * @template T Tipo dos dados do documento.
 */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null; // Dados do documento com ID, ou nulo.
  isLoading: boolean;       // Verdadeiro se estiver carregando.
  error: FirestoreError | Error | null; // Objeto de erro, ou nulo.
}

/* Implementação interna de Query:
  https://github.com/firebase/firebase-js-sdk/blob/c5f08a9bc5da0d2b0207802c972d53724ccef055/packages/firestore/src/lite-api/reference.ts#L143
*/
export interface InternalQuery extends Query<DocumentData> {
  _query: {
    path: {
      canonicalString(): string;
      toString(): string;
    }
  }
}

/**
 * Hook do React para se inscrever em uma coleção ou consulta do Firestore em tempo real.
 * Lida com referências/consultas nulas.
 * 
 *
 * IMPORTANTE! VOCÊ DEVE MEMOIZAR o memoizedTargetRefOrQuery de entrada ou COISAS RUINS ACONTECERÃO
 * use useMemo para memoizá-lo de acordo com a orientação do React. Certifique-se também de que suas dependências sejam referências estáveis
 *  
 * @template T Tipo opcional para dados do documento. O padrão é any.
 * @param {CollectionReference<DocumentData> | Query<DocumentData> | null | undefined} targetRefOrQuery -
 * A CollectionReference ou Query do Firestore. Aguarda se for nulo/indefinido.
 * @returns {UseCollectionResult<T>} Objeto com dados, isLoading, erro.
 */
export function useCollection<T = any>(
    memoizedTargetRefOrQuery: ((CollectionReference<DocumentData> | Query<DocumentData>) & {__memo?: boolean})  | null | undefined,
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    if (!memoizedTargetRefOrQuery) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Usa diretamente memoizedTargetRefOrQuery, pois se assume que é a consulta final
    const unsubscribe = onSnapshot(
      memoizedTargetRefOrQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results: ResultItemType[] = [];
        for (const doc of snapshot.docs) {
          results.push({ ...(doc.data() as T), id: doc.id });
        }
        setData(results);
        setError(null);
        setIsLoading(false);
      },
      (error: FirestoreError) => {
        // Essa lógica extrai o caminho de uma ref ou de uma query
        const path: string =
          memoizedTargetRefOrQuery.type === 'collection'
            ? (memoizedTargetRefOrQuery as CollectionReference).path
            : (memoizedTargetRefOrQuery as unknown as InternalQuery)._query.path.canonicalString()

        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path,
        })

        setError(contextualError)
        setData(null)
        setIsLoading(false)

        // dispara a propagação global de erro
        errorEmitter.emit('permission-error', contextualError);
      }
    );

    return () => unsubscribe();
  }, [memoizedTargetRefOrQuery]); // Re-executa se a consulta/referência de destino mudar.
  
  if(memoizedTargetRefOrQuery && !memoizedTargetRefOrQuery.__memo) {
    throw new Error('Uma consulta ou referência passada para useCollection não foi devidamente memoizada usando useMemoFirebase');
  }

  return { data, isLoading, error };
}
