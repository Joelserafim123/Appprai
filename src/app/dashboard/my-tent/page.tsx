
'use client';

import { useUser } from '@/firebase/provider';
import { useFirebase } from '@/firebase/provider';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Building, Image as ImageIcon, Trash, Plus, MapPin, CheckCircle2 } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { Tent, TentMedia } from '@/lib/types';
import { useCollection } from '@/firebase/firestore/use-collection';
import Image from 'next/image';
import { useMemoFirebase } from '@/firebase/provider';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';
import { addDoc } from 'firebase/firestore';


const tentSchema = z.object({
  name: z.string().min(3, 'O nome da barraca é obrigatório.'),
  description: z.string().min(10, 'A descrição é obrigatória.'),
  beachName: z.string().min(3, 'O nome da praia é obrigatório.'),
  minimumOrderForFeeWaiver: z.preprocess((a) => (a ? parseFloat(z.string().parse(a)) : null), z.number().nullable()),
  location: z.object({
    latitude: z.number({ required_error: "A latitude é obrigatória. Use o botão de GPS." }),
    longitude: z.number({ required_error: "A longitude é obrigatória. Use o botão de GPS." }),
  })
});

type TentFormData = z.infer<typeof tentSchema>;

function TentForm({ user, existingTent, onFinished }: { user: any; existingTent?: Tent | null; onFinished: () => void }) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<TentFormData>({
    resolver: zodResolver(tentSchema),
    defaultValues: {
      name: existingTent?.name || '',
      description: existingTent?.description || '',
      beachName: existingTent?.beachName || '',
      minimumOrderForFeeWaiver: existingTent?.minimumOrderForFeeWaiver || null,
      location: {
        latitude: existingTent?.location?.latitude,
        longitude: existingTent?.location?.longitude,
      }
    },
  });

  const watchedLocation = watch('location');
  const hasLocation = watchedLocation?.latitude && watchedLocation?.longitude;

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
  };

  const handleGetCurrentLocation = () => {
    if(navigator.geolocation) {
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition((position) => {
            setValue('location.latitude', position.coords.latitude, { shouldValidate: true });
            setValue('location.longitude', position.coords.longitude, { shouldValidate: true });
            toast({ title: "Localização GPS obtida com sucesso!" });
            setIsLocating(false);
        }, (error) => {
            toast({ variant: 'destructive', title: "Erro ao obter localização", description: "Por favor, habilite a permissão de localização no seu navegador." });
            setIsLocating(false);
        });
    } else {
        toast({ variant: 'destructive', title: "Erro de localização", description: "Geolocalização não é suportada neste navegador." });
    }
  }

  const onSubmit = async (data: TentFormData) => {
    if (!firestore || !user) return;
    setIsSubmitting(true);
    
    // Tent ID is now the user's UID to enforce one tent per owner
    const docRef = doc(firestore, 'tents', user.uid);
    
    const tentData = {
      ...data,
      ownerId: user.uid,
      ownerName: user.displayName,
      slug: generateSlug(data.name),
    };

    setDoc(docRef, tentData, { merge: true }).then(() => {
        toast({ title: existingTent ? 'Barraca atualizada com sucesso!' : 'Barraca cadastrada com sucesso!' });
        onFinished();
    }).catch((e) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: existingTent ? 'update' : 'create',
            requestResourceData: tentData,
        });
        errorEmitter.emit('permission-error', permissionError);
    }).finally(() => {
        setIsSubmitting(false);
    });
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
          <p className="text-xs text-muted-foreground">Deixe em branco ou 0 se não houver isenção.</p>
           {errors.minimumOrderForFeeWaiver && <p className="text-sm text-destructive">{errors.minimumOrderForFeeWaiver.message}</p>}
        </div>
      
       <div className="space-y-4 rounded-lg border p-4">
            <header className="space-y-1">
                 <Label>Localização da Barraca</Label>
                <p className="text-sm text-muted-foreground">Use o botão abaixo para definir a posição da sua barraca usando o GPS do seu dispositivo.</p>
            </header>
            
            <Button type="button" variant="outline" onClick={handleGetCurrentLocation} className="w-full" disabled={isSubmitting || isLocating}>
               {isLocating ? (
                   <Loader2 className="mr-2 animate-spin" />
               ) : (
                   <MapPin className="mr-2"/>
               )}
                Usar minha Localização GPS
            </Button>
            {hasLocation && !isLocating && (
                <div className="flex items-center justify-center gap-2 text-sm text-green-600 p-2 bg-green-50 rounded-md">
                    <CheckCircle2 className="h-4 w-4" />
                    <p>Localização definida com sucesso!</p>
                </div>
            )}
            {errors.location?.latitude && <p className="text-sm text-destructive">{errors.location.latitude.message}</p>}
            {errors.location?.longitude && <p className="text-sm text-destructive">{errors.location.longitude.message}</p>}
       </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="animate-spin" /> : 'Salvar Informações'}
      </Button>
    </form>
  );
}

const mediaSchema = z.object({
    description: z.string().min(5, 'A descrição é obrigatória.'),
    media: z.any().refine(fileList => fileList.length === 1, 'É necessário selecionar um arquivo.')
});
type MediaFormData = z.infer<typeof mediaSchema>;

function MediaUploadForm({ tentId, onFinished }: { tentId: string, onFinished: () => void }) {
    const { firestore, storage } = useFirebase();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { register, handleSubmit, formState: { errors }, watch } = useForm<MediaFormData>({
        resolver: zodResolver(mediaSchema),
    });

    const file = watch("media")?.[0];
    const previewUrl = useMemo(() => file ? URL.createObjectURL(file) : null, [file]);
    const isVideo = file?.type.startsWith('video/');

    const onSubmit = async (data: MediaFormData) => {
        if (!firestore || !storage || !data.media[0]) return;
        setIsSubmitting(true);
    
        const file = data.media[0];
        const fileId = uuidv4();
        const storagePath = `tents/${tentId}/media/${fileId}`;
        const fileRef = storageRef(storage, storagePath);
        
        try {
            // 1. Upload to Storage
            await uploadBytes(fileRef, file);
            
            // 2. Get Download URL
            const mediaUrl = await getDownloadURL(fileRef);

            const mediaType = file.type.startsWith('video') ? 'video' : 'image';
            
            const mediaData = {
                mediaUrl,
                storagePath,
                description: data.description,
                mediaHint: "beach tent", // Default hint
                type: mediaType,
            };
    
            const collectionRef = collection(firestore, 'tents', tentId, 'media');
            
            // 3. Save reference in Firestore
            addDoc(collectionRef, mediaData).catch((e) => {
                 const permissionError = new FirestorePermissionError({
                    path: collectionRef.path,
                    operation: 'create',
                    requestResourceData: { description: data.description },
                });
                errorEmitter.emit('permission-error', permissionError);
                throw e; // re-throw to be caught by outer catch
            });
            
            toast({ title: "Mídia adicionada com sucesso!" });
            onFinished();
    
        } catch (e: any) {
            console.error("Error adding media:", e);
            toast({ variant: 'destructive', title: 'Erro ao adicionar mídia.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="media">Arquivo de Mídia</Label>
                <Input id="media" type="file" accept="image/*,video/*" {...register('media')} />
                 {previewUrl && (
                    <div className="mt-2 relative aspect-video w-full overflow-hidden rounded-md">
                        {isVideo ? (
                           <video src={previewUrl} controls className="h-full w-full object-cover" />
                        ) : (
                           <Image src={previewUrl} alt="Pré-visualização" fill className="object-cover" />
                        )}
                    </div>
                )}
                {errors.media && <p className="text-sm text-destructive">{typeof errors.media.message === 'string' && errors.media.message}</p>}
            </div>
             <div className="space-y-2">
                <Label htmlFor="description">Descrição da Mídia</Label>
                <Textarea id="description" {...register('description')} placeholder="Ex: Vista da nossa barraca ao entardecer"/>
                {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="ghost" disabled={isSubmitting}>Cancelar</Button></DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="animate-spin" /> : 'Salvar Mídia'}
                </Button>
            </DialogFooter>
        </form>
    );
}

function MediaManager({ tentId }: { tentId: string | null }) {
    const { firestore, storage } = useFirebase();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    
    const mediaQuery = useMemoFirebase(() => {
        if (!firestore || !tentId) return null;
        return query(collection(firestore, 'tents', tentId, 'media'));
    }, [firestore, tentId]);

    const { data: tentMedia, isLoading: loadingMedia } = useCollection<TentMedia>(mediaQuery);

    const handleDeleteMedia = async (media: TentMedia) => {
        if (!firestore || !storage || !tentId || !confirm("Tem certeza que quer apagar este item da galeria?")) return;
        
        setIsSubmitting(true);
        const docRef = doc(firestore, 'tents', tentId, 'media', media.id);
        const fileRef = storageRef(storage, media.storagePath);

        try {
            // Delete from Firestore first
            await deleteDoc(docRef);
            // Then delete from Storage
            await deleteObject(fileRef);

            toast({ title: "Mídia apagada com sucesso!" });
        } catch (e: any) {
            console.error("Error deleting media:", e);
            // If firestore deletion fails, it will be caught here and we won't proceed to storage deletion.
            // If storage deletion fails, we might have an orphaned record in Firestore.
            // A more robust solution would involve a Cloud Function to clean up.
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!tentId) {
        return null;
    }

    return (
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <ImageIcon />
                            Gerenciar Galeria
                        </CardTitle>
                        <CardDescription>
                            Adicione ou remova fotos e vídeos que serão exibidos na página da sua barraca.
                        </CardDescription>
                    </div>
                     <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                             <Plus className="mr-2 h-4 w-4"/> Adicionar
                        </Button>
                    </DialogTrigger>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {loadingMedia ? <Loader2 className="animate-spin mx-auto" /> : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {tentMedia?.map(media => (
                            <div key={media.id} className="relative group aspect-square">
                                 {media.type === 'video' ? (
                                    <video src={media.mediaUrl} className="object-cover rounded-md h-full w-full bg-black" />
                                 ) : (
                                    <Image src={media.mediaUrl} alt={media.description ?? ''} fill className="object-cover rounded-md" />
                                 )}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md">
                                    <Button variant="destructive" size="icon" onClick={() => handleDeleteMedia(media)} disabled={isSubmitting}>
                                        <Trash className="w-4 h-4" />
                                    </Button>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity rounded-b-md">
                                    <p className="truncate">{media.description ?? ''}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                 {tentMedia?.length === 0 && !loadingMedia && (
                    <p className="text-center text-muted-foreground py-4">Nenhum item na galeria.</p>
                 )}
            </CardContent>
        </Card>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Adicionar Nova Mídia</DialogTitle>
            </DialogHeader>
            <MediaUploadForm tentId={tentId} onFinished={() => setIsFormOpen(false)} />
        </DialogContent>
        </Dialog>
    );
}

export default function MyTentPage() {
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();
  const [tent, setTent] = useState<Tent | null>(null);
  const [loadingTent, setLoadingTent] = useState(true);
  const { toast } = useToast();

  const fetchTentData = useCallback(async () => {
    if (!firestore || !user) return;
    setLoadingTent(true);
    try {
        // A barraca do dono tem o ID igual ao UID do dono.
        const docRef = doc(firestore, 'tents', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const tentData = { id: docSnap.id, ...docSnap.data() } as Tent;
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
  }, [firestore, user, toast]);

  useEffect(() => {
    if (!isUserLoading && firestore && user) {
        fetchTentData();
    } else if (!isUserLoading) {
        setLoadingTent(false);
    }
  }, [firestore, user, isUserLoading, fetchTentData]);


  if (isUserLoading || loadingTent) {
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

      <MediaManager tentId={tent?.id || null} />
    </div>
  );

}
