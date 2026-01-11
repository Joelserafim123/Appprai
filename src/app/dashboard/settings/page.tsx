'use client';

import { useUser } from '@/firebase/auth/use-user';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
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
import { useState, useEffect, useCallback } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User as UserIcon, Camera } from 'lucide-react';

const profileSchema = z.object({
  displayName: z.string().min(2, 'O nome completo é obrigatório.'),
  cpf: z.string().refine((cpf) => /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(cpf) || /^\d{11}$/.test(cpf), { message: "O CPF deve ter 11 dígitos." }),
  address: z.string().min(5, 'O endereço é obrigatório.'),
  photoURL: z.string().url('Por favor, insira uma URL válida.').or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function SettingsPage() {
  const { user, loading, refresh } = useUser();
  const { app, db } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<ProfileFormData>();

  useEffect(() => {
    if (user) {
      reset({
        displayName: user.displayName || '',
        cpf: user.cpf || '',
        address: user.address || '',
        photoURL: user.photoURL || '',
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

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  const onSubmit = async (data: ProfileFormData) => {
    if (!user || !app || !db) return;
    setIsSubmitting(true);

    const auth = getAuth(app);
    const currentUser = auth.currentUser;
    const userDocRef = doc(db, "users", user.uid);

    try {
      if (currentUser) {
        // Update Firebase Auth profile
        await updateProfile(currentUser, {
          displayName: data.displayName,
          photoURL: data.photoURL,
        });
      }

      // Update Firestore document
      const firestoreData = {
        displayName: data.displayName,
        address: data.address,
        cpf: data.cpf.replace(/\D/g, ""),
        photoURL: data.photoURL,
      };
      
      updateDoc(userDocRef, firestoreData).catch(err => {
         const permissionError = new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'update',
            requestResourceData: firestoreData,
        });
        errorEmitter.emit('permission-error', permissionError);
        throw permissionError;
      });

      toast({
        title: 'Perfil Atualizado!',
        description: 'Suas informações foram salvas com sucesso.',
      });
      
      // Refresh user data in the context
      if(refresh) refresh();

    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar perfil',
        description: 'Não foi possível salvar suas alterações. Tente novamente.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handlePhotoURLChange = () => {
    const newURL = prompt("Por favor, insira a nova URL da sua foto de perfil:", watch('photoURL') || '');
    if (newURL !== null) {
      reset({ ...watch(), photoURL: newURL });
    }
  }


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
    <div className="w-full max-w-2xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Configurações da Conta</h1>
        <p className="text-muted-foreground">Gerencie as informações da sua conta.</p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Meu Perfil</CardTitle>
            <CardDescription>
              Estas são as informações associadas à sua conta.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
               <div className="relative group">
                <Avatar className="h-20 w-20">
                    <AvatarImage src={watch('photoURL') || user.photoURL || undefined} alt={user.displayName || "User"} />
                    <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                </Avatar>
                 <Button type="button" size="icon" onClick={handlePhotoURLChange} className="absolute bottom-0 right-0 h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="h-4 w-4"/>
                    <span className="sr-only">Change photo</span>
                 </Button>
               </div>
               <div className="flex-1">
                <Label htmlFor="photoURL">URL da Foto</Label>
                 <Input 
                  id="photoURL" 
                  placeholder="https://exemplo.com/sua-foto.jpg"
                  {...register('photoURL')}
                  disabled={isSubmitting}
                />
                 {errors.photoURL && <p className="text-sm text-destructive mt-1">{errors.photoURL.message}</p>}
               </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="displayName">Nome Completo</Label>
              <Input id="displayName" {...register('displayName')} disabled={isSubmitting} />
              {errors.displayName && <p className="text-sm text-destructive">{errors.displayName.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={user.email || ''} readOnly disabled />
              <p className="text-xs text-muted-foreground">O email não pode ser alterado.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input id="cpf" {...register('cpf', { onChange: handleCpfChange })} disabled={isSubmitting} maxLength={14} />
              {errors.cpf && <p className="text-sm text-destructive">{errors.cpf.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input id="address" {...register('address')} disabled={isSubmitting} />
              {errors.address && <p className="text-sm text-destructive">{errors.address.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Tipo de Conta</Label>
              <Input id="role" value={user.role === 'owner' ? 'Dono de Barraca' : 'Cliente'} readOnly disabled />
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
