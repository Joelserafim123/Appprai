'use client';

import { useUser, useFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Info } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc } from 'firebase/firestore';
import { getAuth, updateProfile } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useCallback } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const profileSchema = z.object({
  displayName: z.string().min(2, 'O nome completo é obrigatório.'),
  cpf: z.string().refine((cpf) => /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(cpf), { message: "CPF inválido. Use o formato 000.000.000-00." }),
  cep: z.string().refine(value => /^\d{5}-\d{3}$/.test(value), 'CEP inválido.').optional().or(z.literal('')),
  street: z.string().optional(),
  number: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;


export default function SettingsPage() {
  const { user, isUserLoading, refresh } = useUser();
  const { auth, firestore } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, handleSubmit, formState: { errors, isDirty }, reset, setValue, watch } = useForm<ProfileFormData>({
      resolver: zodResolver(profileSchema),
  });

  const cepValue = watch('cep');

  const profileIncomplete = user && !user.profileComplete;

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
        cpf: user.cpf ? user.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : ''
      });
    }
  }, [user, reset]);

   const handleCpfChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    setValue('cpf', value, { shouldValidate: true });
  }, [setValue]);


   const handleCepChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    
    setValue('cep', value, { shouldValidate: true }); // Update unformatted value

    if (value.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${value}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setValue('street', data.logradouro, { shouldTouch: true });
          setValue('neighborhood', data.bairro, { shouldTouch: true });
          setValue('city', data.localidade, { shouldTouch: true });
          setValue('state', data.uf, { shouldTouch: true });
          toast({ title: "Endereço encontrado!" });
        } else {
          toast({ variant: 'destructive', title: "CEP não encontrado." });
        }
      } catch (error) {
        toast({ variant: 'destructive', title: "Erro ao buscar CEP." });
      }
    }
  }, [setValue, toast]);

   const formattedCep = useMemo(() => {
     if (!cepValue) return '';
     return cepValue.replace(/(\d{5})(\d{3})/, '$1-$2');
   }, [cepValue]);
  
  
  const onSubmit = async (data: ProfileFormData) => {
    if (!user || !firestore || !auth) return;
    setIsSubmitting(true);
  
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Usuário não autenticado.");
      
      const firestoreData: Partial<UserProfile> = {
        displayName: data.displayName,
        profileComplete: true, // Mark profile as complete on save
        cpf: data.cpf.replace(/\D/g, ''),
        cep: data.cep,
        street: data.street,
        number: data.number,
        neighborhood: data.neighborhood,
        city: data.city,
        state: data.state,
      };
      
      const userDocRef = doc(firestore, "users", user.uid);
      await setDoc(userDocRef, firestoreData, { merge: true });
  
      if (currentUser.displayName !== data.displayName) {
        await updateProfile(currentUser, { displayName: data.displayName });
      }
  
      toast({
        title: 'Perfil Atualizado!',
        description: 'Suas informações foram salvas com sucesso.',
      });
  
      await refresh();
  
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: "Não foi possível salvar suas informações. Por favor, tente novamente."
      })
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
                <Avatar className="h-24 w-24">
                    <AvatarImage src={user.photoURL ?? ''} alt={user.displayName || "User"} />
                    <AvatarFallback className="text-3xl">
                        {getInitials(user.displayName)}
                    </AvatarFallback>
                </Avatar>

                <div className="space-y-2">
                    <p className="text-lg font-semibold">{user.displayName?.split(' ')[0]}</p>
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
            </div>
            
            <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <Input {...register('cep')} value={formattedCep} onChange={handleCepChange} placeholder="00000-000" disabled={isSubmitting} />
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
            <Button type="submit" disabled={isSubmitting || !isDirty}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : 'Salvar Alterações'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
