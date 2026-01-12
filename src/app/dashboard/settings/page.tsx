
'use client';

import { useUser } from '@/firebase/provider';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Camera } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase/provider';
import { doc, updateDoc } from 'firebase/firestore';
import { getAuth, updateProfile } from 'firebase/auth';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useCallback, useRef } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

const profileSchema = z.object({
  displayName: z.string().min(2, 'O nome completo é obrigatório.'),
  cpf: z.string().refine((cpf) => /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(cpf) || /^\d{11}$/.test(cpf), { message: "O CPF deve ter 11 dígitos." }),
  address: z.string().min(5, 'O endereço é obrigatório.'),
});

type ProfileFormData = z.infer<typeof profileSchema>;


export default function SettingsPage() {
  const { user, isUserLoading: loading, refresh } = useUser();
  const { firebaseApp, firestore: db, storage } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ProfileFormData>({
      resolver: zodResolver(profileSchema),
      defaultValues: {
          displayName: user?.displayName || '',
          cpf: user?.cpf || '',
          address: user?.address || '',
      }
  });

  useEffect(() => {
    if (user) {
      reset({
        displayName: user.displayName || '',
        cpf: user.cpf || '',
        address: user.address || '',
      });
    }
  }, [user, reset]);

  const handleCpfChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    value = value.replace(/\D/g, "");
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    e.target.value = value;
    return e;
  }, []);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !firebaseApp || !db || !storage) return;

    setIsUploadingPhoto(true);

    try {
      const auth = getAuth(firebaseApp);
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Usuário não autenticado.");

      // If there's an old photo, delete it from storage
      if(user.storagePath) {
          const oldFileRef = storageRef(storage, user.storagePath);
          try {
            await deleteObject(oldFileRef);
          } catch(deleteError: any) {
              // Ignore not found errors, but log others
              if (deleteError.code !== 'storage/object-not-found') {
                console.warn("Não foi possível apagar a foto antiga:", deleteError);
              }
          }
      }

      const fileId = uuidv4();
      const newStoragePath = `users/${user.uid}/profile/${fileId}`;
      const fileRef = storageRef(storage, newStoragePath);
      
      // 1. Upload new photo
      await uploadBytes(fileRef, file);
      const photoURL = await getDownloadURL(fileRef);

      // 2. Update Auth profile
      await updateProfile(currentUser, { photoURL });

      // 3. Update storagePath in Firestore
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, { 
          storagePath: newStoragePath,
          photoURL: photoURL
      });
      
      toast({
        title: 'Foto de Perfil Atualizada!',
        description: 'Sua nova foto foi salva com sucesso.',
      });

      refresh(); // Re-fetch user data to update UI

    } catch(error) {
       console.error("Erro ao atualizar foto de perfil:", error);
       toast({
          variant: 'destructive',
          title: 'Erro no Upload',
          description: 'Não foi possível salvar sua nova foto de perfil.',
       });
    } finally {
      setIsUploadingPhoto(false);
    }
  };
  
  const onSubmit = async (data: ProfileFormData) => {
    if (!user || !db) return;
    setIsSubmitting(true);

    try {
        const firestoreData: {[key: string]: any} = {
            displayName: data.displayName,
            address: data.address,
            cpf: data.cpf.replace(/\D/g, ""),
        };
      
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, firestoreData);
      
        toast({
            title: 'Perfil Atualizado!',
            description: 'Suas informações foram salvas com sucesso.',
        });

        refresh(); 

    } catch(error: any) {
        console.error("Error updating profile:", error);
        const permissionError = new FirestorePermissionError({
            path: `users/${user.uid}`,
            operation: 'update',
            requestResourceData: { displayName: data.displayName },
        });
        errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsSubmitting(false);
    }
  };


  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <p>Por favor, faça login para ver suas configurações.</p>;
  }

  return (
    <div className="w-full max-w-2xl space-y-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Configurações da Conta</h1>
        <p className="text-muted-foreground">Gerencie as informações da sua conta e foto de perfil.</p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
             <div className="flex items-center gap-6">
                
                <div className="relative group">
                    <Avatar className="h-24 w-24">
                        <AvatarImage src={user.photoURL ?? undefined} alt={user.displayName ?? ''} />
                        <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                    </Avatar>
                     <button 
                        type="button" 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSubmitting || isUploadingPhoto}
                        className={cn(
                          "absolute inset-0 bg-black/50 flex items-center justify-center rounded-full text-white",
                          "opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
                        )}
                        aria-label="Alterar foto de perfil"
                    >
                       {isUploadingPhoto ? <Loader2 className="w-8 h-8 animate-spin" /> : <Camera className="w-8 h-8" />}
                    </button>
                    <Input
                        id="profile-picture"
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept="image/png, image/jpeg"
                        disabled={isSubmitting || isUploadingPhoto}
                    />
                </div>

                <div className="space-y-1">
                    <CardTitle>Meu Perfil</CardTitle>
                    <CardDescription>
                      Clique na sua foto para alterá-la.
                    </CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-2">
              <Label htmlFor="displayName">Nome Completo</Label>
              <Input id="displayName" {...register('displayName')} disabled={isSubmitting}/>
              {errors.displayName && <p className="text-sm text-destructive">{errors.displayName.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={user.email || ''} disabled readOnly />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                {...register('cpf', {
                  onChange: handleCpfChange
                })}
                placeholder="000.000.000-00"
                maxLength={14}
                disabled={isSubmitting}
              />
              {errors.cpf && <p className="text-sm text-destructive">{errors.cpf.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input id="address" {...register('address')} disabled={isSubmitting} />
              {errors.address && <p className="text-sm text-destructive">{errors.address.message}</p>}
            </div>

          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : 'Salvar Alterações'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
