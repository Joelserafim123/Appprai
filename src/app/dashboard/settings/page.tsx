
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
import { User as UserIcon } from 'lucide-react';

const profileSchema = z.object({
  displayName: z.string().min(2, 'O nome completo é obrigatório.'),
  cpf: z.string().refine((cpf) => /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(cpf) || /^\d{11}$/.test(cpf), { message: "O CPF deve ter 11 dígitos." }),
  address: z.string().min(5, 'O endereço é obrigatório.'),
  photoURL: z.string().url('Por favor, insira uma URL válida.').or(z.literal('')).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function SettingsPage() {
  const { user, loading, refresh } = useUser();
  const { app, db } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ProfileFormData>({
      resolver: zodResolver(profileSchema),
  });

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

    // We separate the Auth update from the Firestore update to handle errors individually
    try {
      if (currentUser) {
        await updateProfile(currentUser, {
          displayName: data.displayName,
          photoURL: data.photoURL,
        });
      }
    } catch(authError) {
      console.error("Error updating Firebase Auth profile:", authError);
       toast({
        variant: 'destructive',
        title: 'Erro de Autenticação',
        description: 'Não foi possível atualizar seu perfil de autenticação. Tente novamente.',
      });
       setIsSubmitting(false);
       return;
    }

    const firestoreData = {
      displayName: data.displayName,
      address: data.address,
      cpf: data.cpf.replace(/\D/g, ""),
      photoURL: data.photoURL,
    };
    
    updateDoc(userDocRef, firestoreData)
      .then(() => {
        toast({
          title: 'Perfil Atualizado!',
          description: 'Suas informações foram salvas com sucesso.',
        });
        if(refresh) refresh();
      })
      .catch(err => {
         const permissionError = new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'update',
            requestResourceData: firestoreData,
        });
        errorEmitter.emit('permission-error', permissionError);
        // We no longer throw here as the emitter handles it.
        // We show a generic toast instead.
         toast({
            variant: 'destructive',
            title: 'Erro ao salvar no banco de dados',
            description: 'Não foi possível salvar suas alterações. Verifique as permissões.',
        });
      })
      .finally(() => {
        setIsSubmitting(false);
      });
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
                <Avatar className="h-20 w-20">
                    <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? ''} />
                    <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                </Avatar>
                <div className="space-y-2 w-full">
                    <Label htmlFor="photoURL">URL da Foto de Perfil</Label>
                    <Input id="photoURL" {...register('photoURL')} placeholder="https://exemplo.com/sua-foto.jpg" disabled={isSubmitting}/>
                    {errors.photoURL && <p className="text-sm text-destructive">{errors.photoURL.message}</p>}
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
