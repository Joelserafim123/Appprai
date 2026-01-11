
'use client';

import { useUser } from '@/firebase/auth/use-user';
import { useFirebase } from '@/firebase/provider';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Building, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { Tent } from '@/app/page';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const tentSchema = z.object({
  name: z.string().min(3, 'O nome da barraca é obrigatório.'),
  description: z.string().min(10, 'A descrição é obrigatória.'),
  beachName: z.string().min(3, 'O nome da praia é obrigatório.'),
  minimumOrderForFeeWaiver: z.preprocess((a) => (a ? parseFloat(z.string().parse(a)) : null), z.number().nullable()),
});

type TentFormData = z.infer<typeof tentSchema>;

function TentForm({ user, existingTent, onFinished }: { user: any; existingTent?: Tent | null; onFinished: () => void }) {
  const { db } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<TentFormData>({
    resolver: zodResolver(tentSchema),
    defaultValues: {
      name: existingTent?.name || '',
      description: existingTent?.description || '',
      beachName: existingTent?.beachName || '',
      minimumOrderForFeeWaiver: existingTent?.minimumOrderForFeeWaiver || 0,
    },
  });

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
  };

  const onSubmit = async (data: TentFormData) => {
    if (!db || !user) return;
    setIsSubmitting(true);

    const tentId = user.uid; // Use user's UID as the document ID
    
    const tentData = {
      ...data,
      ownerId: user.uid,
      slug: generateSlug(data.name),
    };

    try {
      const docRef = doc(db, 'tents', tentId);
      await setDoc(docRef, tentData, { merge: true });
      
      toast({ title: existingTent ? 'Barraca atualizada com sucesso!' : 'Barraca cadastrada com sucesso!' });
      onFinished();
    } catch (e: any) {
      const permissionError = new FirestorePermissionError({
        path: `tents/${tentId}`,
        operation: existingTent ? 'update' : 'create',
        requestResourceData: tentData,
      });
      errorEmitter.emit('permission-error', permissionError);
      toast({ variant: 'destructive', title: 'Erro ao salvar informações.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Nome da Barraca</Label>
        <Input id="name" {...register('name')} disabled={isSubmitting} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" {...register('description')} disabled={isSubmitting} />
        {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="beachName">Nome da Praia</Label>
        <Input id="beachName" {...register('beachName')} placeholder="Ex: Praia de Copacabana" disabled={isSubmitting} />
        {errors.beachName && <p className="text-sm text-destructive">{errors.beachName.message}</p>}
      </div>
       <div className="space-y-2">
          <Label htmlFor="minimumOrderForFeeWaiver">Valor Mínimo para Isenção de Aluguel (R$)</Label>
          <Input id="minimumOrderForFeeWaiver" type="number" step="0.01" {...register('minimumOrderForFeeWaiver')} disabled={isSubmitting} />
          <p className="text-xs text-muted-foreground">Deixe 0 se não houver isenção.</p>
           {errors.minimumOrderForFeeWaiver && <p className="text-sm text-destructive">{errors.minimumOrderForFeeWaiver.message}</p>}
        </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="animate-spin" /> : 'Salvar Informações'}
      </Button>
    </form>
  );
}

export default function MyTentPage() {
  const { user, loading: userLoading } = useUser();
  const { db } = useFirebase();
  const [tent, setTent] = useState<Tent | null>(null);
  const [loadingTent, setLoadingTent] = useState(true);
  const { toast } = useToast();

  const fetchTentData = async () => {
    if (!db || !user) return;
    setLoadingTent(true);
    const tentsRef = collection(db, 'tents');
    try {
        const q = query(tentsRef, where('ownerId', '==', user.uid));
        const docSnap = await getDocs(q);
        if (!docSnap.empty) {
            const doc = docSnap.docs[0];
            const tentData = { id: doc.id, ...doc.data() } as Tent;
            setTent(tentData);
        } else {
            setTent(null);
        }
    } catch(e) {
        toast({ variant: 'destructive', title: 'Erro ao buscar barraca', description: 'Não foi possível carregar os dados da sua barraca.' });
    } finally {
        setLoadingTent(false);
    }
  };

  useEffect(() => {
    if(db && user) {
        fetchTentData();
    } else if (!userLoading) {
        setLoadingTent(false);
    }
  }, [db, user, userLoading]);


  if (userLoading || loadingTent) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== 'owner') {
    return <p>Acesso negado.</p>;
  }

  return (
    <div className="w-full max-w-2xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Minha Barraca</h1>
        <p className="text-muted-foreground">Gerencie as informações da sua barraca de praia.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building />
            {tent ? 'Editar Informações da Barraca' : 'Cadastrar Nova Barraca'}
          </CardTitle>
          <CardDescription>
            {tent ? 'Atualize os detalhes do seu negócio.' : 'Preencha os dados para que os clientes encontrem você.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TentForm user={user} existingTent={tent} onFinished={fetchTentData} />
        </CardContent>
      </Card>
    </div>
  );

}
