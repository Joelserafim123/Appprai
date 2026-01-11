
'use client';

import { useUser } from '@/firebase/auth/use-user';
import { useFirebase } from '@/firebase/provider';
import { collection, query, where, getDocs, doc, setDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Building, Image as ImageIcon, Trash, Plus } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
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
import { useCollection } from '@/firebase/firestore/use-collection';
import Image from 'next/image';

const tentSchema = z.object({
  name: z.string().min(3, 'O nome da barraca é obrigatório.'),
  description: z.string().min(10, 'A descrição é obrigatória.'),
  beachName: z.string().min(3, 'O nome da praia é obrigatório.'),
  minimumOrderForFeeWaiver: z.preprocess((a) => (a ? parseFloat(z.string().parse(a)) : null), z.number().nullable()),
});

type TentFormData = z.infer<typeof tentSchema>;

interface TentImage {
  id: string;
  imageUrl: string;
  imageHint?: string;
  description?: string;
}

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

function ImageManager({ tentId }: { tentId: string | null }) {
    const { db } = useFirebase();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const imagesQuery = useMemo(() => {
        if (!db || !tentId) return null;
        return query(collection(db, 'tents', tentId, 'images'));
    }, [db, tentId]);

    const { data: tentImages, loading: loadingImages } = useCollection<TentImage>(imagesQuery);

    const handleAddImage = async () => {
        if (!db || !tentId) return;
        const imageUrl = prompt("Por favor, insira a URL da imagem:");
        if (!imageUrl) return;

        setIsSubmitting(true);
        const imageData = { 
            imageUrl,
            imageHint: "beach tent", // Default hint
            description: "A beautiful view from the tent"
        };
        const collectionRef = collection(db, 'tents', tentId, 'images');

        try {
            await addDoc(collectionRef, imageData);
            toast({ title: "Imagem adicionada com sucesso!" });
        } catch(e) {
            const permissionError = new FirestorePermissionError({
                path: `tents/${tentId}/images`,
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
        if (!db || !tentId || !confirm("Tem certeza que quer apagar esta imagem?")) return;
        
        setIsSubmitting(true);
        const docRef = doc(db, 'tents', tentId, 'images', imageId);
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

    if (!tentId) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ImageIcon />
                    Gerenciar Galeria de Fotos
                </CardTitle>
                <CardDescription>
                    Adicione ou remova fotos que serão exibidas na página da sua barraca.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {loadingImages ? <Loader2 className="animate-spin mx-auto" /> : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {tentImages?.map(image => (
                            <div key={image.id} className="relative group aspect-square">
                                <Image src={image.imageUrl} alt={image.description || 'Tent image'} fill className="object-cover rounded-md" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Button variant="destructive" size="icon" onClick={() => handleDeleteImage(image.id)} disabled={isSubmitting}>
                                        <Trash className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                 {tentImages?.length === 0 && !loadingImages && (
                    <p className="text-center text-muted-foreground py-4">Nenhuma imagem na galeria.</p>
                 )}
                <Button onClick={handleAddImage} className="w-full" disabled={isSubmitting}>
                    <Plus className="mr-2"/> Adicionar Imagem
                </Button>
            </CardContent>
        </Card>
    );
}

export default function MyTentPage() {
  const { user, loading: userLoading } = useUser();
  const { db } = useFirebase();
  const [tent, setTent] = useState<Tent | null>(null);
  const [loadingTent, setLoadingTent] = useState(true);
  const { toast } = useToast();

  const fetchTentData = useCallback(async () => {
    if (!db || !user) return;
    setLoadingTent(true);
    try {
        const tentsRef = collection(db, 'tents');
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
        console.error(e);
        toast({ variant: 'destructive', title: 'Erro ao buscar barraca', description: 'Não foi possível carregar os dados da sua barraca.' });
    } finally {
        setLoadingTent(false);
    }
  }, [db, user, toast]);

  useEffect(() => {
    if(db && user) {
        fetchTentData();
    } else if (!userLoading) {
        setLoadingTent(false);
    }
  }, [db, user, userLoading, fetchTentData]);


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
    <div className="w-full max-w-2xl space-y-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Minha Barraca</h1>
        <p className="text-muted-foreground">Gerencie as informações e a galeria da sua barraca de praia.</p>
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

      <ImageManager tentId={tent?.id || null} />
    </div>
  );

}
