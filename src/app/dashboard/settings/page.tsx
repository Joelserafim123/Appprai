
'use client';

import { useUser } from '@/firebase/provider';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Upload, User as UserIcon } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { useState, useEffect, useCallback, useRef } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

const profileSchema = z.object({
  displayName: z.string().min(2, 'O nome completo é obrigatório.'),
  address: z.string().min(5, 'O endereço é obrigatório.'),
});

type ProfileFormData = z.infer<typeof profileSchema>;


export default function SettingsPage() {
  const { user, isUserLoading: loading, refresh } = useUser();
  const { firebaseApp, firestore, storage } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { db } = useFirebase();
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<ProfileFormData>({
      resolver: zodResolver(profileSchema),
      defaultValues: {
          displayName: user?.displayName || '',
          address: user?.address || '',
      }
  });

  useEffect(() => {
    if (user) {
      reset({
        displayName: user.displayName || '',
        address: user.address || '',
      });
    }
  }, [user, reset]);
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !storage || !db) return;

    setIsUploading(true);

    const fileId = uuidv4();
    const filePath = `user-profiles/${user.uid}/${fileId}`;
    const fileRef = storageRef(storage, filePath);

    try {
        await uploadBytes(fileRef, file);
        const photoURL = await getDownloadURL(fileRef);
        
        const auth = getAuth(firebaseApp);
        if (auth.currentUser) {
            await updateProfile(auth.currentUser, { photoURL });
        }

        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, {
            photoURL,
            storagePath: filePath,
        });

        toast({ title: 'Foto de perfil atualizada!' });
        refresh();

    } catch (error: any) {
        console.error("Error uploading profile picture:", error);
        toast({
            variant: 'destructive',
            title: 'Erro no Upload',
            description: 'Não foi possível salvar sua nova foto de perfil.',
        });
    } finally {
        setIsUploading(false);
    }
};

  const onSubmit = async (data: ProfileFormData) => {
    if (!user || !firestore || !firebaseApp) return;
    setIsSubmitting(true);
  
    try {
      const auth = getAuth(firebaseApp);
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("User not authenticated.");
  
      const firestoreData: { [key: string]: any } = {
        displayName: data.displayName,
        address: data.address,
      };
  
      const userDocRef = doc(firestore, "users", user.uid);
      await updateDoc(userDocRef, firestoreData);
  
      const authProfileUpdate: { displayName?: string } = {};
      if (currentUser.displayName !== data.displayName) {
        authProfileUpdate.displayName = data.displayName;
      }
      
      if (Object.keys(authProfileUpdate).length > 0) {
        await updateProfile(currentUser, authProfileUpdate);
      }
  
      toast({
        title: 'Perfil Atualizado!',
        description: 'Suas informações foram salvas com sucesso.',
      });
  
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
  
  const formattedCpf = user.cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');

  return (
    <div className="w-full max-w-2xl space-y-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Configurações da Conta</h1>
        <p className="text-muted-foreground">Gerencie as informações da sua conta.</p>
      </header>

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
                <div className="relative">
                    <Avatar className="h-24 w-24">
                        <AvatarImage src={user.photoURL || undefined} alt={user.displayName || "User"} />
                        <AvatarFallback className="text-3xl">
                            {getInitials(user.displayName)}
                        </AvatarFallback>
                    </Avatar>
                     {isUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                            <Loader2 className="h-8 w-8 animate-spin text-white" />
                        </div>
                    )}
                </div>
                <div className="space-y-2">
                    <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                        <Upload className="mr-2"/>
                        Alterar Foto
                    </Button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept="image/*"
                        disabled={isUploading}
                    />
                    <p className="text-xs text-muted-foreground">JPG, GIF ou PNG. Tamanho máximo de 800K.</p>
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
                value={formattedCpf || ''}
                disabled
                readOnly
              />
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
