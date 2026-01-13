
'use client';

import { useUser } from '@/firebase/provider';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, User as UserIcon, Info, Upload } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, uploadFile } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { getAuth, updateProfile } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const profileSchema = z.object({
  displayName: z.string().min(2, 'O nome completo é obrigatório.'),
  cep: z.string().refine(value => /^\d{5}-?\d{3}$/.test(value), 'CEP inválido.').optional().or(z.literal('')),
  street: z.string().optional(),
  number: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
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
          cep: user?.cep || '',
          street: user?.street || '',
          number: user?.number || '',
          neighborhood: user?.neighborhood || '',
          city: user?.city || '',
          state: user?.state || '',
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
        cep: user.cep || '',
        street: user.street || '',
        number: user.number || '',
        neighborhood: user.neighborhood || '',
        city: user.city || '',
        state: user.state || '',
      });
    }
  }, [user, reset]);


   const handleCepChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    if (value.length > 5) {
      value = value.slice(0, 5) + '-' + value.slice(5);
    }
    setValue('cep', value, { shouldValidate: true });

    if (value.length === 9) { // CEP is complete
      try {
        const res = await fetch(`https://viacep.com.br/ws/${value.replace('-', '')}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setValue('street', data.logradouro);
          setValue('neighborhood', data.bairro);
          setValue('city', data.localidade);
          setValue('state', data.uf);
          toast({ title: "Endereço encontrado!" });
        } else {
          toast({ variant: 'destructive', title: "CEP não encontrado." });
        }
      } catch (error) {
        toast({ variant: 'destructive', title: "Erro ao buscar CEP." });
      }
    }
  }, [setValue, toast]);
  
  
  const onSubmit = async (data: ProfileFormData) => {
    if (!user || !firestore || !firebaseApp || !storage) return;
    setIsSubmitting(true);
  
    try {
      const auth = getAuth(firebaseApp);
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("User not authenticated.");
      
      let photoURL = user.photoURL; // Keep current photo URL by default
      const file = data.photo?.[0];

      // If a new file is uploaded, upload it to Storage and get the URL
      if (file) {
        const { downloadURL } = await uploadFile(storage, file, `users/${user.uid}`);
        photoURL = downloadURL;
      }
  
      // Prepare data for Firestore update
      const firestoreData: { [key: string]: any } = {
        displayName: data.displayName,
        photoURL: photoURL,
      };

      // Conditionally add address fields if they are provided
      if (data.cep) firestoreData.cep = data.cep;
      if (data.street) firestoreData.street = data.street;
      if (data.number) firestoreData.number = data.number;
      if (data.neighborhood) firestoreData.neighborhood = data.neighborhood;
      if (data.city) firestoreData.city = data.city;
      if (data.state) firestoreData.state = data.state;
      if (data.cpf) firestoreData.cpf = data.cpf.replace(/\D/g, '');
      
      // Update Firestore document
      const userDocRef = doc(firestore, "users", user.uid);
       updateDoc(userDocRef, firestoreData).catch(e => {
         const permissionError = new FirestorePermissionError({
          path: userDocRef.path,
          operation: 'update',
          requestResourceData: firestoreData,
        });
        errorEmitter.emit('permission-error', permissionError);
        throw e;
      });
  
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
      if (error.code !== 'permission-denied') {
          toast({
            variant: "destructive",
            title: "Erro ao atualizar",
            description: "Não foi possível salvar suas informações. Por favor, tente novamente."
          })
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
        <p className="text-muted-foreground">Gerencie as informações da sua conta.</p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Meu Perfil</CardTitle>
            <CardDescription>
                Atualize as informações da sua conta. O CPF e a sua função não podem ser alterados após o cadastro inicial.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
             <div className="flex items-center gap-6">
                <div className="group relative">
                    <Avatar className="h-24 w-24">
                        <AvatarImage src={photoPreview ?? ''} alt={user.displayName || "User"} />
                        <AvatarFallback className="text-3xl">
                            <UserIcon className="h-12 w-12 text-muted-foreground" />
                        </AvatarFallback>
                    </Avatar>
                     <label htmlFor="photo" className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                        <Upload className="h-6 w-6 text-white" />
                    </label>
                    <Input id="photo" type="file" className="hidden" accept="image/*" {...register('photo')} />
                </div>

                <div className="space-y-2">
                    <p className="font-medium">{user.displayName?.split(' ')[0]}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <p className="text-xs font-semibold text-primary capitalize py-1 px-2 bg-primary/10 rounded-full inline-block">{user.role === 'owner' ? 'Dono de Barraca' : 'Cliente'}</p>
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
                value={user.cpf ? user.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : ''}
                disabled
                readOnly
                placeholder="000.000.000-00"
              />
            </div>
            
            <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <Input {...register('cep')} onChange={handleCepChange} placeholder="00000-000" disabled={isSubmitting} />
                {errors.cep && <p className="text-sm text-destructive">{errors.cep.message}</p>}
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                    <Label htmlFor="street">Rua</Label>
                    <Input id="street" {...register('street')} disabled={isSubmitting} />
                    {errors.street && <p className="text-sm text-destructive">{errors.street.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="number">Número</Label>
                    <Input id="number" {...register('number')} disabled={isSubmitting} />
                    {errors.number && <p className="text-sm text-destructive">{errors.number.message}</p>}
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input id="neighborhood" {...register('neighborhood')} disabled={isSubmitting} />
                {errors.neighborhood && <p className="text-sm text-destructive">{errors.neighborhood.message}</p>}
            </div>
            <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input id="city" {...register('city')} disabled={isSubmitting} />
                    {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="state">Estado</Label>
                    <Input id="state" {...register('state')} disabled={isSubmitting} />
                    {errors.state && <p className="text-sm text-destructive">{errors.state.message}</p>}
                </div>
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
