
'use client';

import { useUser } from '@/firebase/auth/use-user';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Trash, Plus, UserCircle, Image as ImageIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase/provider';
import { doc, updateDoc, collection, addDoc, deleteDoc, query } from 'firebase/firestore';
import { getAuth, updateProfile } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCollection } from '@/firebase/firestore/use-collection';
import Image from 'next/image';

const profileSchema = z.object({
  displayName: z.string().min(2, 'O nome completo é obrigatório.'),
  cpf: z.string().refine((cpf) => /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(cpf) || /^\d{11}$/.test(cpf), { message: "O CPF deve ter 11 dígitos." }),
  address: z.string().min(5, 'O endereço é obrigatório.'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileImage {
  id: string;
  imageUrl: string;
  description?: string;
}

function ProfileImageManager({ user }: { user: any }) {
    const { db } = useFirebase();
    const { toast } = useToast();
    const { refresh } = useUser();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const imagesQuery = useMemo(() => {
        if (!db || !user) return null;
        return query(collection(db, 'users', user.uid, 'images'));
    }, [db, user]);

    const { data: profileImages, loading: loadingImages, error } = useCollection<ProfileImage>(imagesQuery);

    const handleAddImage = async () => {
        if (!db || !user) return;
        const imageUrl = prompt("Por favor, insira a URL da imagem:");
        if (!imageUrl) return;

        setIsSubmitting(true);
        const imageData = { 
            imageUrl,
            description: "Profile image"
        };
        const collectionRef = collection(db, 'users', user.uid, 'images');

        try {
            await addDoc(collectionRef, imageData);
            toast({ title: "Imagem adicionada com sucesso!" });
        } catch(e) {
            const permissionError = new FirestorePermissionError({
                path: `users/${user.uid}/images`,
                operation: 'create',
                requestResourceData: imageData,
            });
            errorEmitter.emit('permission-error', permissionError);
            toast({ variant: 'destructive', title: 'Erro ao adicionar imagem.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteImage = async (imageId: string) => {
        if (!db || !user || !confirm("Tem certeza que quer apagar esta imagem?")) return;
        
        setIsSubmitting(true);
        const docRef = doc(db, 'users', user.uid, 'images', imageId);
        try {
            await deleteDoc(docRef);
            toast({ title: "Imagem apagada com sucesso!" });
        } catch (e) {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
            toast({ variant: 'destructive', title: 'Erro ao apagar imagem.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSetProfilePicture = async (imageUrl: string) => {
        if (!user || !db) return;
        setIsSubmitting(true);

        const auth = getAuth(useFirebase().app!);
        const currentUser = auth.currentUser;
        const userDocRef = doc(db, "users", user.uid);

        try {
            if (currentUser) {
                await updateProfile(currentUser, { photoURL: imageUrl });
            }
            await updateDoc(userDocRef, { photoURL: imageUrl });

            toast({ title: "Foto de perfil atualizada!" });
            if (refresh) refresh();
        } catch (error) {
            const permissionError = new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'update',
                requestResourceData: { photoURL: imageUrl },
            });
            errorEmitter.emit('permission-error', permissionError);
            toast({ variant: 'destructive', title: 'Erro ao definir foto do perfil.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (error) {
        return <p className='text-destructive'>Erro ao carregar galeria: {error.message}</p>
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ImageIcon />
                    Galeria de Fotos do Perfil
                </CardTitle>
                <CardDescription>
                    Adicione imagens e escolha sua foto de perfil.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {loadingImages ? <Loader2 className="animate-spin mx-auto" /> : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {profileImages?.map(image => (
                            <div key={image.id} className="relative group aspect-square">
                                <Image src={image.imageUrl} alt={image.description || 'Profile image'} fill className="object-cover rounded-md" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                     <Button variant="secondary" size="icon" onClick={() => handleSetProfilePicture(image.imageUrl)} disabled={isSubmitting} title="Definir como foto de perfil">
                                        <UserCircle className="w-4 h-4" />
                                    </Button>
                                    <Button variant="destructive" size="icon" onClick={() => handleDeleteImage(image.id)} disabled={isSubmitting} title="Apagar imagem">
                                        <Trash className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                 {profileImages?.length === 0 && !loadingImages && (
                    <p className="text-center text-muted-foreground py-4">Nenhuma imagem na galeria.</p>
                 )}
                <Button onClick={handleAddImage} className="w-full" disabled={isSubmitting || loadingImages}>
                    {isSubmitting || loadingImages ? <Loader2 className="animate-spin" /> : <><Plus className="mr-2"/> Adicionar Imagem (URL)</>}
                </Button>
            </CardContent>
        </Card>
    );
}


export default function SettingsPage() {
  const { user, loading, refresh } = useUser();
  const { app, db } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ProfileFormData>({
      resolver: zodResolver(profileSchema),
      defaultValues: {
          displayName: user?.displayName || '',
          cpf: user?.cpf || '',
          address: user?.address || ''
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
    

    try {
      if (currentUser && currentUser.displayName !== data.displayName) {
        await updateProfile(currentUser, {
          displayName: data.displayName,
        });
      }
      
      const userDocRef = doc(db, "users", user.uid);
      const firestoreData = {
        displayName: data.displayName,
        address: data.address,
        cpf: data.cpf.replace(/\D/g, ""),
      };

      await updateDoc(userDocRef, firestoreData);
      
      toast({
        title: 'Perfil Atualizado!',
        description: 'Suas informações foram salvas com sucesso.',
      });
      if(refresh) refresh();

    } catch(error: any) {
      console.error("Error updating profile:", error);
      if (error instanceof FirestorePermissionError) {
          errorEmitter.emit('permission-error', error);
      } else {
         toast({
            variant: 'destructive',
            title: 'Erro ao atualizar perfil',
            description: error.message || 'Não foi possível salvar suas alterações.',
        });
      }
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
             <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                    <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? ''} />
                    <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                    <CardTitle>Meu Perfil</CardTitle>
                    <CardDescription>
                      Estas são as informações associadas à sua conta.
                    </CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
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
       {user && <ProfileImageManager user={user} />}
    </div>
  );
}

    