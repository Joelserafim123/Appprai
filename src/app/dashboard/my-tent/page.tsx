
'use client';

import { useUser } from '@/firebase/auth/use-user';
import { useFirebase } from '@/firebase/provider';
import { collection, query, where, getDocs, doc, setDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Building, Image as ImageIcon, Trash, Plus, MapPin, Upload } from 'lucide-react';
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
import type { Tent } from '@/app/page';
import { useCollection } from '@/firebase/firestore/use-collection';
import Image from 'next/image';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';

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

interface TentImage {
  id: string;
  imageUrl: string;
  imageHint: string;
  description: string;
}

function TentForm({ user, existingTent, onFinished }: { user: any; existingTent?: Tent | null; onFinished: () => void }) {
  const { db } = useFirebase();
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
    if (!db || !user) return;
    setIsSubmitting(true);

    const tentId = user.uid;
    
    const tentData = {
      ...data,
      ownerId: user.uid,
      slug: generateSlug(data.name),
    };

    try {
      const docRef = doc(db, 'tents', tentId);
      // Use setDoc without merge to ensure the nested location object is overwritten.
      await setDoc(docRef, tentData);
      
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

const imageSchema = z.object({
    description: z.string().min(5, 'A descrição é obrigatória.'),
    image: z.any().refine(fileList => fileList.length === 1, 'É necessário selecionar um arquivo de imagem.')
});
type ImageFormData = z.infer<typeof imageSchema>;

function ImageUploadForm({ tentId, onFinished }: { tentId: string, onFinished: () => void }) {
    const { db } = useFirebase();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { register, handleSubmit, formState: { errors }, watch } = useForm<ImageFormData>({
        resolver: zodResolver(imageSchema),
    });

    const file = watch("image")?.[0];
    const previewUrl = useMemo(() => file ? URL.createObjectURL(file) : null, [file]);

    const onSubmit = (data: ImageFormData) => {
        if (!db || !data.image[0]) return;
        setIsSubmitting(true);

        const file = data.image[0];
        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onloadend = async () => {
            const imageUrl = reader.result as string;
            const imageData = {
                imageUrl,
                description: data.description,
                imageHint: "beach tent", // Default hint
            };

            const collectionRef = collection(db, 'tents', tentId, 'images');

            try {
                addDoc(collectionRef, imageData).catch((e) => {
                   const permissionError = new FirestorePermissionError({
                      path: `tents/${tentId}/images`,
                      operation: 'create',
                      requestResourceData: imageData,
                  });
                  errorEmitter.emit('permission-error', permissionError);
                  throw e;
                });
                toast({ title: "Imagem adicionada com sucesso!" });
                onFinished();
            } catch(e) {
                toast({ variant: 'destructive', title: 'Erro ao adicionar imagem.' });
            } finally {
                setIsSubmitting(false);
            }
        };
        
        reader.onerror = () => {
            toast({ variant: 'destructive', title: 'Erro ao ler o arquivo de imagem.' });
            setIsSubmitting(false);
        };
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="image">Arquivo da Imagem</Label>
                <Input id="image" type="file" accept="image/png, image/jpeg, image/gif" {...register('image')} />
                 {previewUrl && (
                    <div className="mt-2 relative aspect-video w-full overflow-hidden rounded-md">
                        <Image src={previewUrl} alt="Pré-visualização da imagem" fill className="object-cover" />
                    </div>
                )}
                {errors.image && <p className="text-sm text-destructive">{typeof errors.image.message === 'string' && errors.image.message}</p>}
            </div>
             <div className="space-y-2">
                <Label htmlFor="description">Descrição da Imagem</Label>
                <Textarea id="description" {...register('description')} placeholder="Ex: Vista da nossa barraca ao entardecer"/>
                {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="ghost" disabled={isSubmitting}>Cancelar</Button></DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="animate-spin" /> : 'Salvar Imagem'}
                </Button>
            </DialogFooter>
        </form>
    );
}

function ImageManager({ tentId }: { tentId: string | null }) {
    const { db } = useFirebase();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    
    const imagesQuery = useMemo(() => {
        if (!db || !tentId) return null;
        return query(collection(db, 'tents', tentId, 'images'));
    }, [db, tentId]);

    const { data: tentImages, loading: loadingImages } = useCollection<TentImage>(imagesQuery);

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
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <ImageIcon />
                            Gerenciar Galeria de Fotos
                        </CardTitle>
                        <CardDescription>
                            Adicione ou remova fotos que serão exibidas na página da sua barraca.
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
                {loadingImages ? <Loader2 className="animate-spin mx-auto" /> : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {tentImages?.map(image => (
                            <div key={image.id} className="relative group aspect-square">
                                <Image src={image.imageUrl} alt={image.description} fill className="object-cover rounded-md" />
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
            </CardContent>
        </Card>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Adicionar Nova Imagem</DialogTitle>
            </DialogHeader>
            <ImageUploadForm tentId={tentId} onFinished={() => setIsFormOpen(false)} />
        </DialogContent>
        </Dialog>
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
    
    

    
