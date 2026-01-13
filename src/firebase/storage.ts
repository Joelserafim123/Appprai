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
 * Uploads a file to a specified path in Firebase Storage.
 * @param storage The FirebaseStorage instance.
 * @param file The file to upload.
 * @param path The folder path in the bucket (e.g., 'users/[uid]').
 * @returns The public download URL of the uploaded file.
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
 * Deletes a file from Firebase Storage using its full URL.
 * @param storage The FirebaseStorage instance.
 * @param url The full `gs://` or `https://firebasestorage.googleapis.com/...` URL of the file.
 * @returns A promise that resolves when the file is deleted.
 */
export async function deleteFileByUrl(storage: FirebaseStorage, url: string) {
  if (!url) return;
  try {
    const fileRef = ref(storage, url);
    await deleteObject(fileRef);
  } catch (error: any) {
    // A "object-not-found" error is okay, it means the file is already gone.
    if (error.code !== 'storage/object-not-found') {
      console.error('Error deleting file from storage:', error);
      throw error;
    }
  }
}
