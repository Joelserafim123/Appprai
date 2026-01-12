'use client';

import { useUser } from '@/firebase/provider';
import { useFirebase } from '@/firebase/provider';
import { collection, query, where, getDocs, doc, setDoc, addDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Building, Image as ImageIcon, Trash, Plus, MapPin, Upload, Video } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { Tent } from '@/lib/types';
import { useCollection } from '@/firebase/firestore/use-collection';
import Image from 'next/image';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { useMemoFirebase } from '@/firebase/provider';
import { v4 as uuidv4 } from 'uuid';

const mapContainerStyle = {
  width: '100%',
  height: '300px',
  borderRadius: '0.5rem',
};

const mapOptions = {
  styles: [
    { "featureType": "poi", "stylers": [{ "visibility": "off" }] },
    { "featureType": "road", "elementType": "labels", "stylers": [{ "visibility": "off" }] },
    { "featureType": "transit", "stylers": [{ "visibility": "off" }] },
  ],
  disableDefaultUI: true,
  zoomControl: true,
  gestureHandling: 'greedy'
};

const defaultCenter = {
  lat: -22.9845,
  lng: -43.2040 // Default to Copacabana
};

const tentSchema = z.object({
  name: z.string().min(3, 'O nome da barraca é obrigatório.'),
  description: z.string().min(10, 'A descrição é obrigatória.'),
  beachName: z.string().min(3, 'O nome da praia é obrigatório.'),
  minimumOrderForFeeWaiver: z.preprocess((a) => (a ? parseFloat(z.string().parse(a)) : null), z.number().nullable()),
  location: z.object({
    latitude: z.preprocess((a) => parseFloat(z.string().parse(a)), z.number()),
    longitude: z.preprocess((a) => parseFloat(z.string().parse(a)), z.number()),
  })
});

type TentFormData = z.infer<typeof tentSchema>;

interface TentMedia {
  id: string;
  mediaUrl: string;
  storagePath: string;
  mediaHint: string;
  description: string;
  type: 'image' | 'video';
}

function TentForm({ user, existingTent, onFinished }: { user: any; existingTent?: Tent | null; onFinished: () => void }) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: googleMapsApiKey
  });

  const { register, handleSubmit, formState: { errors }, control, setValue, watch } = useForm<TentFormData>({
    resolver: zodResolver(tentSchema),
    defaultValues: {
      name: existingTent?.name || '',
      description: existingTent?.description || '',
      beachName: existingTent?.beachName || '',
      minimumOrderForFeeWaiver: existingTent?.minimumOrderForFeeWaiver || null,
      location: {
        latitude: existingTent?.location?.latitude || defaultCenter.lat,
        longitude: existingTent?.location?.longitude || defaultCenter.lng,
      }
    },
  });

  const watchedLocation = watch('location');

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
  };

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
        setValue('location.latitude', e.latLng.lat());
        setValue('location.longitude', e.latLng.lng());
    }
  }, [setValue]);

  const handleGetCurrentLocation = () => {
    if(navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            setValue('location.latitude', position.coords.latitude);
            setValue('location.longitude', position.coords.longitude);
            toast({ title: "Localização atual obtida!" });
        }, (error) => {
            toast({ variant: 'destructive', title: "Erro de localização", description: error.message });
        });
    } else {
        toast({ variant: 'destructive', title: "Erro de localização", description: "Geolocalização não é suportada neste navegador." });
    }
  }

  const onSubmit = async (data: TentFormData) => {
    if (!firestore || !user) return;
    setIsSubmitting(true);
    
    // Use the user's UID as the document ID for their tent.
    // This ensures one tent per owner and simplifies queries.
    const tentId = user.uid;
    const docRef = doc(firestore, 'tents', tentId);
    
    const tentData = {
      ...data,
      ownerId: user.uid,
      slug: generateSlug(data.name),
    };

    try {
      // Use setDoc with merge:true to either create or update the document.
      await setDoc(docRef, tentData, { merge: true });
      
      toast({ title: existingTent ? 'Barraca atualizada com sucesso!' : 'Barraca cadastrada com sucesso!' });
      onFinished();
    } catch (e: any) {
      console.error("Error saving tent data:", e);
      const permissionError = new FirestorePermissionError({
        path: `tents/${tentId}`,
        operation: existingTent ? 'update' : 'create',
        requestResourceData: tentData,
      });
      errorEmitter.emit('permission-error', permissionError);
      // The listener will show a generic error toast.
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
          <p className="text-xs text-muted-foreground">Deixe em branco ou 0 se não houver isenção.</p>
           {errors.minimumOrderForFeeWaiver && <p className="text-sm text-destructive">{errors.minimumOrderForFeeWaiver.message}</p>}
        </div>
      
       <div className="space-y-4">
            <header className="space-y-1">
                 <Label>Localização da Barraca</Label>
                <p className="text-sm text-muted-foreground">Clique no mapa para definir a posição exata ou use o botão para obter sua localização atual.</p>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="latitude">Latitude</Label>
                    <Input id="latitude" type="number" step="any" {...register('location.latitude')} disabled={isSubmitting} />
                    {errors.location?.latitude && <p className="text-sm text-destructive">{errors.location.latitude.message}</p>}
                 </div>
                 <div className="space-y-2">
                    <Label htmlFor="longitude">Longitude</Label>
                    <Input id="longitude" type="number" step="any" {...register('location.longitude')} disabled={isSubmitting} />
                    {errors.location?.longitude && <p className="text-sm text-destructive">{errors.location.longitude.message}</p>}
                 </div>
            </div>
             <Button type="button" variant="outline" onClick={handleGetCurrentLocation} className="w-full" disabled={isSubmitting}>
                <MapPin className="mr-2"/> Obter Localização Atual
            </Button>

            {isLoaded ? (
                <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={{ lat: watchedLocation.latitude, lng: watchedLocation.longitude }}
                    zoom={15}
                    options={mapOptions}
                    onClick={handleMapClick}
                >
                    <Marker position={{ lat: watchedLocation.latitude, lng: watchedLocation.longitude }} />
                </GoogleMap>
            ) : loadError ? <div>Erro ao carregar o mapa.</div> : <Loader2 className="animate-spin" />}
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
        const fileExtension = file.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExtension}`;
        const storagePath = `tents/${tentId}/${fileName}`;
        const fileRef = storageRef(storage, storagePath);
        
        try {
            // 1. Upload file to Firebase Storage
            await uploadBytes(fileRef, file);
    
            // 2. Get download URL
            const mediaUrl = await getDownloadURL(fileRef);
    
            const mediaType = file.type.startsWith('video') ? 'video' : 'image';
            
            // 3. Prepare data for Firestore
            const mediaData = {
                mediaUrl,
                storagePath, // Save storage path for easy deletion
                description: data.description,
                mediaHint: "beach tent", // Default hint
                type: mediaType,
            };
    
            // 4. Save metadata to Firestore
            const collectionRef = collection(firestore, 'tents', tentId, 'media');
            await addDoc(collectionRef, mediaData);
            
            toast({ title: "Mídia adicionada com sucesso!" });
            onFinished();
    
        } catch (e: any) {
            console.error("Error adding media:", e);
    
            const permissionError = new FirestorePermissionError({
                path: `tents/${tentId}/media`,
                operation: 'create',
                requestResourceData: { description: data.description }, // Don't log file data
            });
            errorEmitter.emit('permission-error', permissionError);
            // The listener will show a toast.
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="media">Arquivo de Mídia</Label>
                <Input id="media" type="file" accept="image/png, image/jpeg, image/gif, video/mp4, video/quicktime" {...register('media')} />
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
            // Delete file from Storage first
            await deleteObject(fileRef);
            // Then delete the document from Firestore
            await deleteDoc(docRef);
            toast({ title: "Mídia apagada com sucesso!" });
        } catch (e: any) {
            console.error("Error deleting media:", e);
            if (e.code === 'storage/object-not-found') {
                // If file doesn't exist in storage, just delete firestore doc
                 await deleteDoc(docRef).catch(e_firestore => {
                     // If firestore deletion also fails, emit a permission error for Firestore
                      const permissionError = new FirestorePermissionError({
                        path: docRef.path,
                        operation: 'delete',
                      });
                      errorEmitter.emit('permission-error', permissionError);
                 });
                 toast({ title: "Mídia apagada do banco de dados." });
            } else {
                const permissionError = new FirestorePermissionError({
                    path: docRef.path,
                    operation: 'delete',
                });
                errorEmitter.emit('permission-error', permissionError);
                // Do not show a generic toast, the error listener will.
            }
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
                                    <Image src={media.mediaUrl} alt={media.description} fill className="object-cover rounded-md" />
                                 )}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md">
                                    <Button variant="destructive" size="icon" onClick={() => handleDeleteMedia(media)} disabled={isSubmitting}>
                                        <Trash className="w-4 h-4" />
                                    </Button>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity rounded-b-md">
                                    <p className="truncate">{media.description}</p>
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
        // Correctly query for the tent document where ownerId matches the user's UID.
        const tentsRef = collection(firestore, 'tents');
        const q = query(tentsRef, where("ownerId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            // Assuming one owner has only one tent
            const docSnap = querySnapshot.docs[0];
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
    if (isUserLoading) {
      setLoadingTent(true);
      return;
    }
    if (firestore && user) {
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

      {/* The MediaManager is only displayed if a tent exists, using the tent's ID */}
      <MediaManager tentId={tent?.id || null} />
    </div>
  );

}
