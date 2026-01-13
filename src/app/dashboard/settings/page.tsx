
'use client';

import { useUser } from '@/firebase/provider';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, User as UserIcon, Info, Upload, Trash } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase/provider';
import { doc, updateDoc } from 'firebase/firestore';
import { getAuth, updateProfile } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Image from 'next/image';

const profileSchema = z.object({
  displayName: z.string().min(2, 'O nome completo é obrigatório.'),
  cpf: z.string().refine((cpf) => /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(cpf) || /^\d{11}$/.test(cpf), { message: "O CPF deve ter 11 dígitos e é obrigatório." }),
  address: z.string().min(5, 'O endereço é obrigatório.'),
  photo: z.any().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;


export default function SettingsPage() {
  const { user, isUserLoading: loading, refresh } = useUser();
  const { firebaseApp, firestore, storage } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<ProfileFormData>({
      resolver: zodResolver(profileSchema),
      defaultValues: {
          displayName: user?.displayName || '',
          cpf: user?.cpf || '',
          address: user?.address || '',
      }
  });

  const photoFile = watch("photo")?.[0];
  const photoPreview = useMemo(() => {
    if (photoFile) return URL.createObjectURL(photoFile);
    return user?.photoURL;
  }, [photoFile, user?.photoURL]);


  useEffect(() => {
    if (user) {
      reset({
        displayName: user.displayName || '',
        cpf: user.cpf ? user.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '',
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
    setValue('cpf', value);
    return value;
  }, [setValue]);
  
  
  const onSubmit = async (data: ProfileFormData) => {
    if (!user || !firestore || !firebaseApp || !storage) return;
    setIsSubmitting(true);
  
    try {
      const auth = getAuth(firebaseApp);
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("User not authenticated.");
      
      let photoURL = user.photoURL; // Keep current photo URL by default
      let storagePath: string | null = null;
      const file = data.photo?.[0];

      // If a new file is uploaded, upload it to Storage and get the URL
      if (file) {
        storagePath = `users/${user.uid}/profile.jpg`;
        const fileRef = ref(storage, storagePath);
        await uploadBytes(fileRef, file);
        photoURL = await getDownloadURL(fileRef);
      }
  
      // Prepare data for Firestore update
      const firestoreData: { [key: string]: any } = {
        displayName: data.displayName,
        address: data.address,
        photoURL: photoURL // Explicitly save the new or existing photoURL
      };

      if (!user.cpf) {
        firestoreData.cpf = data.cpf.replace(/\D/g, "");
      }
  
      // Update Firestore document
      const userDocRef = doc(firestore, "users", user.uid);
      await updateDoc(userDocRef, firestoreData);
  
      // Prepare data for Auth profile update
      const authProfileUpdate: { displayName?: string, photoURL?: string } = {};
      if (currentUser.displayName !== data.displayName) {
        authProfileUpdate.displayName = data.displayName;
      }
      if (photoURL && currentUser.photoURL !== photoURL) {
        authProfileUpdate.photoURL = photoURL;
      }
      
      // Update Auth profile if there are changes
      if (Object.keys(authProfileUpdate).length > 0) {
        await updateProfile(currentUser, authProfileUpdate);
      }
  
      toast({
        title: 'Perfil Atualizado!',
        description: 'Suas informações foram salvas com sucesso.',
      });
  
      // Refresh user state to reflect changes in the UI
      refresh();
  
    } catch (error: any) {
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
  
  const isProfileIncomplete = !user.cpf || !user.address;

  return (
    <div className="w-full max-w-2xl space-y-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Configurações da Conta</h1>
        <p className="text-muted-foreground">Gerencie as informações da sua conta.</p>
      </header>

      {isProfileIncomplete && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Complete seu Perfil</AlertTitle>
          <AlertDescription>
            Por favor, preencha seu CPF e endereço para completar seu cadastro e utilizar todas as funcionalidades.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Meu Perfil</CardTitle>
            <CardDescription>
                Atualize as informações da sua conta. O CPF não pode ser alterado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
             <div className="flex items-center gap-6">
                <div className="group relative">
                    <Avatar className="h-24 w-24">
                        <AvatarImage src={photoPreview ?? ''} alt={user.displayName || "User"} />
                        <AvatarFallback className="text-3xl">
                            {getInitials(user.displayName)}
                        </AvatarFallback>
                    </Avatar>
                     <label htmlFor="photo" className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                        <Upload className="h-6 w-6 text-white" />
                    </label>
                    <Input id="photo" type="file" className="hidden" accept="image/*" {...register('photo')} />
                </div>

                <div className="space-y-2">
                    <p className="font-medium">{user.displayName}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
            </div>

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
                {...register('cpf')}
                onChange={(e) => {
                  const value = handleCpfChange(e);
                  e.target.value = value;
                }}
                disabled={isSubmitting || !!user.cpf}
                placeholder="000.000.000-00"
                maxLength={14}
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
