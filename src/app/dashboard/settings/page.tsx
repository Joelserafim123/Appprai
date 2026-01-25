'use client';

import { useUser, useFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Info, User as UserIcon, Camera } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc, writeBatch } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { UserProfile } from '@/lib/types';
import { isValidCpf } from '@/lib/utils';
import { uploadFile, deleteFileByUrl } from '@/firebase/storage';
import { FirebaseError } from 'firebase/app';


const profileSchema = z.object({
  displayName: z.string().min(2, 'O nome completo é obrigatório.'),
  cpf: z.string()
    .min(1, "O CPF é obrigatório.")
    .refine(isValidCpf, { message: "O número do CPF informado é inválido." }),
  cep: z.string().refine(value => !value || /^\d{5}-?\d{3}$/.test(value.replace(/\D/g, '')) , { message: 'CEP inválido. Deve conter 8 números.' }).optional(),
  street: z.string().optional().or(z.literal('')),
  number: z.string().optional().or(z.literal('')),
  neighborhood: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;


export default function SettingsPage() {
  const { user, isUserLoading, refresh } = useUser();
  const { auth, firestore, storage } = useFirebase();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  
  const { register, handleSubmit, formState: { errors, isDirty }, reset, setValue, watch } = useForm<ProfileFormData>({
      resolver: zodResolver(profileSchema),
      defaultValues: {
          displayName: '',
          cpf: '',
          cep: '',
          street: '',
          number: '',
          neighborhood: '',
          city: '',
          state: '',
      }
  });
  
  const watchedCep = watch('cep');

  const profileIncomplete = user && !user.profileComplete;

  useEffect(() => {
    if (user) {
      reset({
        displayName: user.displayName || '',
        cpf: user.cpf ? user.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '',
        cep: user.cep || '',
        street: user.street || '',
        number: user.number || '',
        neighborhood: user.neighborhood || '',
        city: user.city || '',
        state: user.state || '',
      });
      setProfileImagePreview(user.photoURL);
    }
  }, [user, reset]);
  

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImageFile(file);
      setProfileImagePreview(URL.createObjectURL(file));
    }
  };

  const handleCpfChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    setValue('cpf', value, { shouldValidate: true, shouldDirty: true });
  }, [setValue]);


   const handleCepChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    value = value.replace(/(\d{5})(\d)/, '$1-$2');
    setValue('cep', value, { shouldValidate: true, shouldDirty: true });
  }, [setValue]);
  
  useEffect(() => {
    const cepDigits = watchedCep?.replace(/\D/g, '') || '';
    const fetchAddress = async () => {
        if (cepDigits && cepDigits.length === 8) {
             try {
                const res = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);
                const data = await res.json();
                if (!data.erro) {
                setValue('street', data.logradouro, { shouldTouch: true, shouldDirty: true });
                setValue('neighborhood', data.bairro, { shouldTouch: true, shouldDirty: true });
                setValue('city', data.localidade, { shouldTouch: true, shouldDirty: true });
                setValue('state', data.uf, { shouldTouch: true, shouldDirty: true });
                toast({ title: "Endereço encontrado!" });
                } else {
                toast({ variant: 'destructive', title: "CEP não encontrado." });
                }
            } catch (error) {
                toast({ variant: 'destructive', title: "Erro ao buscar CEP." });
            }
        }
    };
    const timeoutId = setTimeout(() => {
        fetchAddress();
    }, 500); // Debounce API call
    return () => clearTimeout(timeoutId);
  }, [watchedCep, setValue, toast]);
  
  
const onSubmit = async (data: ProfileFormData) => {
    if (!user || !firestore || !auth || !storage) return;
    
    setIsSubmitting(true);
    let newPhotoURL: string | null = user.photoURL;
    const oldPhotoURL = user.photoURL;

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Usuário não autenticado. Por favor, faça login novamente.');
      }

      // Passo 1: Upload da nova imagem (se houver)
      if (profileImageFile) {
        const { downloadURL } = await uploadFile(storage, profileImageFile, `users/${user.uid}/profile-pictures`);
        newPhotoURL = downloadURL;
      }

      // Passo 2: Preparar e executar atualizações no banco de dados
      const userDocRef = doc(firestore, 'users', user.uid);
      const batch = writeBatch(firestore);

      const firestoreUpdateData: Partial<UserProfile> = {
        displayName: data.displayName,
        profileComplete: true,
        photoURL: newPhotoURL,
        cep: data.cep?.replace(/\D/g, '') || null,
        street: data.street || null,
        number: data.number || null,
        neighborhood: data.neighborhood || null,
        city: data.city || null,
        state: data.state || null,
      };

      // Lógica do CPF (só pode ser definido uma vez)
      if (!user.cpf) {
        const cpfDigits = data.cpf.replace(/\D/g, '');
        const newCpfDocRef = doc(firestore, 'cpfs', cpfDigits);
        const cpfDoc = await getDoc(newCpfDocRef);
        if (cpfDoc.exists()) {
          throw new Error('Este CPF já está associado a outra conta.');
        }
        firestoreUpdateData.cpf = cpfDigits;
        batch.set(newCpfDocRef, { userId: user.uid });
      }

      batch.update(userDocRef, firestoreUpdateData as any);
      await batch.commit();

      // Passo 3: Atualizar o perfil de autenticação do Firebase
      if (currentUser.displayName !== data.displayName || currentUser.photoURL !== newPhotoURL) {
        await updateProfile(currentUser, {
          displayName: data.displayName,
          photoURL: newPhotoURL,
        });
      }

      // Passo 4: Apagar a foto antiga (apenas se tudo deu certo e uma nova foi enviada)
      if (profileImageFile && oldPhotoURL && oldPhotoURL.includes('firebasestorage.googleapis.com')) {
        await deleteFileByUrl(storage, oldPhotoURL);
      }
      
      toast({
        title: 'Perfil Atualizado!',
        description: 'Suas informações foram salvas com sucesso.',
      });
      await refresh();

    } catch (error: any) {
      console.error("Error updating profile:", error);
      const description = error.message || 'Não foi possível salvar as alterações. Tente novamente.';
      toast({
        variant: 'destructive',
        title: 'Erro ao Salvar',
        description: `Detalhe: ${description}`,
        duration: 9000
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isUserLoading) {
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
    <div className="w-full max-w-2xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Configurações da Conta</h1>
        <p className="text-muted-foreground">Gerencie as informações da sua conta.</p>
      </header>

      {profileIncomplete && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Complete o seu perfil</AlertTitle>
          <AlertDescription>
            Para continuar a usar o BeachPal, por favor preencha e salve as informações do seu perfil. O CPF é obrigatório.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Meu Perfil</CardTitle>
            <CardDescription>
                Atualize as informações da sua conta. O e-mail e o CPF não podem ser alterados após o registo inicial.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
             <div className="flex items-center gap-6">
                 <div className="relative group">
                    <Avatar className="h-24 w-24 rounded-lg">
                        <AvatarImage src={profileImagePreview || ''} alt={user.displayName || "User"} />
                        <AvatarFallback>
                            <UserIcon className="h-12 w-12 text-muted-foreground" />
                        </AvatarFallback>
                    </Avatar>
                    <button 
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Camera className="w-8 h-8" />
                    </button>
                    <Input 
                      type="file" 
                      ref={avatarInputRef}
                      className="hidden"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handleProfileImageChange}
                      disabled={isSubmitting}
                    />
                 </div>
                <div className="space-y-2">
                    <p className="text-lg font-semibold">{user.displayName}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    {user.role && <p className="text-xs font-semibold text-primary capitalize py-1 px-2 bg-primary/10 rounded-full inline-block">{user.role === 'owner' ? 'Dono de Barraca' : 'Cliente'}</p>}
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
                onChange={handleCpfChange}
                disabled={isSubmitting || !!user.cpf}
                readOnly={!!user.cpf}
                placeholder="000.000.000-00"
              />
               {errors.cpf && <p className="text-sm text-destructive">{errors.cpf.message}</p>}
               {!!user.cpf && <p className="text-xs text-muted-foreground pt-1">O CPF não pode ser alterado após definido.</p>}
            </div>
            
            <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <Input {...register('cep')} onChange={handleCepChange} placeholder="00000-000" disabled={isSubmitting} maxLength={9} />
                {errors.cep && <p className="text-sm text-destructive">{errors.cep.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-2">
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-2">
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
            <Button type="submit" disabled={isSubmitting || (!isDirty && !profileImageFile)}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : 'Salvar Alterações'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
