
'use client';

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  FirebaseStorage,
} from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

/**
 * Faz upload de um arquivo para um caminho especificado no Firebase Storage.
 * @param storage A instância do FirebaseStorage.
 * @param file O arquivo para upload.
 * @param path O caminho da pasta no bucket (ex: 'users/[uid]').
 * @returns A URL de download pública do arquivo enviado.
 */
export async function uploadFile(
  storage: FirebaseStorage,
  file: File,
  path: string
): Promise<{ downloadURL: string; storagePath: string }> {
  const fileId = uuidv4();
  const fileExtension = file.name.split('.').pop() || 'jpg';
  const fullStoragePath = `${path}/${fileId}.${fileExtension}`;
  const fileRef = ref(storage, fullStoragePath);

  await uploadBytes(fileRef, file);
  const downloadURL = await getDownloadURL(fileRef);

  return { downloadURL, storagePath: fullStoragePath };
}

/**
 * Deleta um arquivo do Firebase Storage usando sua URL completa.
 * @param storage A instância do FirebaseStorage.
 * @param url A URL completa `gs://` ou `https://firebasestorage.googleapis.com/...` do arquivo.
 * @returns Uma promessa que resolve quando o arquivo é deletado.
 */
export async function deleteFileByUrl(storage: FirebaseStorage, url: string) {
  if (!url) return;
  try {
    const fileRef = ref(storage, url);
    await deleteObject(fileRef);
  } catch (error: any) {
    // Um erro "object-not-found" é aceitável, significa que o arquivo já foi removido.
    if (error.code !== 'storage/object-not-found') {
      console.error('Erro ao deletar arquivo do storage:', error);
      throw error;
    }
  }
}
