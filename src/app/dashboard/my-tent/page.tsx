'use client';

import { useUser, useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Building, MapPin, Clock, Upload, Image as ImageIcon } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import type { Tent, OperatingHours, TentFormData } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { collection, query, where, limit, setDoc, doc, updateDoc } from 'firebase/firestore';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import Image from 'next/image';
import { FirebaseError } from 'firebase/app';

const operatingHoursSchema = z.object({
  isOpen: z.boolean(),
  open: z.string(),
  close: z.string(),
});

const tentSchema = z.object({
  name: z.string().min(3, 'O nome da barraca é obrigatório.'),
  description: z.string().min(10, 'A descrição é obrigatória.'),
  beachName: z.string().min(3, 'O nome da praia é obrigatório.'),
  minimumOrderForFeeWaiver: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : parseFloat(String(val))),
    z.number({ invalid_type_error: 'O valor deve ser um número.' }).nullable()
  ),
  location: z.object({
    latitude: z.number({ required_error: 'A localização no mapa é obrigatória.'}),
    longitude: z.number({ required_error: 'A localização no mapa é obrigatória.'}),
  }),
  operatingHours: z.object({
    monday: operatingHoursSchema,
    tuesday: operatingHoursSchema,
    wednesday: operatingHoursSchema,
    thursday: operatingHoursSchema,
    friday: operatingHoursSchema,
    saturday: operatingHoursSchema,
    sunday: operatingHoursSchema,
  }),
});


const defaultHours = {
  isOpen: true,
  open: '09:00',
  close: '18:00',
};

const defaultOperatingHours: OperatingHours = {
  monday: { ...defaultHours },
  tuesday: { ...defaultHours },
  wednesday: { ...defaultHours },
  thursday: { ...defaultHours },
  friday: { ...defaultHours },
  saturday: { ...defaultHours },
  sunday: { ...defaultHours },
};

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

const defaultCenter = {
  lat: -22.9845, // Copacabana default
  lng: -43.2040
};


function TentForm({ user, existingTent, onFinished }: { user: any; existingTent?: Tent | null; onFinished: () => void }) {
  const { toast } = useToast();
  const { firestore, storage } = useFirebase();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [mapCenter, setMapCenter] = useState(existingTent?.location ? { lat: existingTent.location.latitude, lng: existingTent.location.longitude } : defaultCenter);
  
  const [bannerImageFile, setBannerImageFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(existingTent?.bannerUrl || null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, formState: { errors }, setValue, watch, control, reset } = useForm<TentFormData>({
    resolver: zodResolver(tentSchema),
    defaultValues: {
      name: '',
      description: '',
      beachName: '',
      minimumOrderForFeeWaiver: null,
      location: undefined,
      operatingHours: defaultOperatingHours,
    },
  });

  const watchedLocation = watch('location');
  const markerPosition = watchedLocation;

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: ['marker']
  });

  const handleGetCurrentLocation = useCallback((panMap = false) => {
    if(navigator.geolocation) {
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition((position) => {
            const newLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
            };
            setValue('location', newLocation, { shouldValidate: true });
            if (panMap) {
                setMapCenter({ lat: newLocation.latitude, lng: newLocation.longitude });
            }
            toast({ title: "Localização GPS obtida com sucesso!" });
            setIsLocating(false);
        }, (error) => {
            toast({ variant: 'destructive', title: "Erro ao obter localização", description: "Por favor, habilite a permissão de localização no seu navegador." });
            setIsLocating(false);
        });
    } else {
        toast({ variant: 'destructive', title: "Erro de localização", description: "Geolocalização não é suportada neste navegador." });
    }
  }, [setValue, toast]);

  useEffect(() => {
    if (existingTent) {
      reset({
        name: existingTent.name || '',
        description: existingTent.description || '',
        beachName: existingTent.beachName || '',
        minimumOrderForFeeWaiver: existingTent.minimumOrderForFeeWaiver ?? null,
        location: existingTent.location || undefined,
        operatingHours: existingTent.operatingHours || defaultOperatingHours,
      });
      if (existingTent.location) {
        setMapCenter({ lat: existingTent.location.latitude, lng: existingTent.location.longitude });
      } else {
        handleGetCurrentLocation(true);
      }
      if (existingTent.bannerUrl) {
          setBannerPreview(existingTent.bannerUrl);
      }
    } else {
        reset({
            name: '',
            description: '',
            beachName: '',
            minimumOrderForFeeWaiver: null,
            location: undefined,
            operatingHours: defaultOperatingHours,
        });
        handleGetCurrentLocation(true);
    }
  }, [existingTent, reset, handleGetCurrentLocation]);
  
  const daysOfWeek = [
      { id: 'sunday', label: 'Domingo' },
      { id: 'monday', label: 'Segunda-feira' },
      { id: 'tuesday', label: 'Terça-feira' },
      { id: 'wednesday', label: 'Quarta-feira' },
      { id: 'thursday', label: 'Quinta-feira' },
      { id: 'friday', label: 'Sexta-feira' },
      { id: 'saturday', label: 'Sábado' },
  ] as const;

  const onMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
        setValue('location', { latitude: e.latLng.lat(), longitude: e.latLng.lng() }, { shouldValidate: true });
    }
  }, [setValue]);

  const onMarkerDragEnd = useCallback((e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
          setValue('location', { latitude: e.latLng.lat(), longitude: e.latLng.lng() }, { shouldValidate: true });
      }
  }, [setValue]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        setBannerImageFile(file);
        setBannerPreview(URL.createObjectURL(file));
    }
  }

  const onSubmit = async (data: TentFormData) => {
    if (!firestore || !user || !storage) return;
    setIsSubmitting(true);
    toast({ title: "A guardar alterações..." });

    try {
      let bannerDownloadURL: string | null = existingTent?.bannerUrl || null;
      
      const tentId = existingTent ? existingTent.id : doc(collection(firestore, "tents")).id;
      const tentDocRef = doc(firestore, "tents", tentId);

      if (bannerImageFile) {
        toast({ title: 'A fazer upload da imagem do banner...' });
        const fileRef = storageRef(storage, `tents/${tentId}/banner.jpg`);
        const uploadMetadata = { customMetadata: { ownerUid: user.uid } };
        
        await uploadBytes(fileRef, bannerImageFile, uploadMetadata);
        bannerDownloadURL = await getDownloadURL(fileRef);
        
        toast({ title: 'Upload do banner bem-sucedido!' });
      }

      const tentDataForFirestore = {
        ...data,
        ownerId: user.uid,
        ownerName: user.displayName,
        bannerUrl: bannerDownloadURL,
      };

      if (existingTent) {
        await updateDoc(tentDocRef, tentDataForFirestore as any);
        toast({ title: `Barraca atualizada com sucesso!` });
      } else {
        const newTentData = {
          ...tentDataForFirestore,
          hasAvailableKits: false,
          averageRating: 0,
          reviewCount: 0,
        };
        await setDoc(tentDocRef, newTentData);
        toast({ title: `Barraca cadastrada com sucesso!` });
      }

      onFinished();
    } catch (error: any) {
        console.error("Error saving tent data:", error);
        let title = "Erro ao Salvar";
        let description = "Ocorreu um erro ao salvar as informações da barraca. Por favor, tente novamente.";

        if (error instanceof FirebaseError) {
            switch(error.code) {
                case 'storage/unauthorized':
                    title = "Erro de Permissão no Upload";
                    description = "Você não tem permissão para carregar esta imagem. Verifique as regras de segurança do armazenamento.";
                    break;
                case 'storage/canceled':
                    title = "Upload Cancelado";
                    description = "O upload da imagem foi cancelado.";
                    break;
                case 'permission-denied':
                    title = "Erro de Permissão no Banco de Dados";
                    description = "Você não tem permissão para salvar os dados da barraca. Verifique as regras de segurança do Firestore.";
                    break;
                default:
                    description = error.message || description;
            }
        }
        
        toast({
            variant: "destructive",
            title: title,
            description: description,
            duration: 9000,
        });

    } finally {
        setIsSubmitting(false);
    }
  };
  
    const renderMap = () => {
        if (loadError) {
            return <div className="flex items-center justify-center h-full bg-destructive/10 text-destructive-foreground p-4">Erro ao carregar o mapa. Verifique a sua chave de API do Google Maps e as configurações do projeto.</div>;
        }
        if (!isLoaded) {
            return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin mr-2" /> Carregando Mapa...</div>;
        }
        return (
            <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={mapCenter}
                zoom={16}
                mapTypeId='satellite'
                onClick={onMapClick}
                options={{
                    disableDefaultUI: true,
                    zoomControl: false,
                    gestureHandling: 'greedy'
                }}
            >
                {markerPosition?.latitude && markerPosition?.longitude && (
                    <Marker
                        position={{ lat: markerPosition.latitude, lng: markerPosition.longitude }}
                        draggable={true}
                        onDragEnd={onMarkerDragEnd}
                    />
                )}
            </GoogleMap>
        );
    };


  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <input type="file" ref={bannerFileInputRef} onChange={handleFileChange} hidden accept="image/png, image/jpeg, image/webp" />
      
      <div className="space-y-2">
        <Label>Imagem do Banner</Label>
        <div className="relative aspect-video w-full rounded-md border bg-muted group overflow-hidden">
            {bannerPreview ? (
                <Image src={bannerPreview} alt="Banner da barraca" layout="fill" objectFit="cover" />
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <ImageIcon className="h-10 w-10" />
                    <p className="mt-2 text-sm">Sem imagem de banner</p>
                </div>
            )}
            <button type="button" onClick={() => bannerFileInputRef.current?.click()} className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                <Upload className='h-8 w-8'/>
            </button>
        </div>
      </div>

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
                <p className="text-sm text-muted-foreground">Clique no mapa para definir a localização exata ou arraste o marcador. Use o botão para centrar o mapa na sua posição atual.</p>
            </header>

            <div className="h-[400px] w-full rounded-md overflow-hidden bg-muted">
                {renderMap()}
            </div>

            <Button type="button" variant="outline" onClick={() => handleGetCurrentLocation(true)} className="w-full" disabled={isSubmitting || isLocating}>
            {isLocating ? (
                <Loader2 className="mr-2 animate-spin" />
            ) : (
                <MapPin className="mr-2"/>
            )}
                Centrar mapa na minha localização
            </Button>
            {errors.location && <p className="text-sm text-destructive">A localização é obrigatória. Por favor, clique no mapa.</p>}
        </div>

        <div className="space-y-4 rounded-lg border p-4">
            <header className="space-y-1">
                <Label className="flex items-center gap-2"><Clock /> Horário de Funcionamento</Label>
                <p className="text-sm text-muted-foreground">Defina os dias e horários em que sua barraca está aberta.</p>
            </header>
            <div className="space-y-4">
             {daysOfWeek.map((day) => {
                const dayKey = `operatingHours.${day.id}` as const;
                const isDayOpen = watch(`${dayKey}.isOpen`);
                return (
                    <div key={day.id} className="space-y-2 rounded-md border p-3">
                        <div className="flex items-center justify-between">
                            <Label htmlFor={`${dayKey}.isOpen`} className="font-medium">{day.label}</Label>
                            <Controller
                                control={control}
                                name={`${dayKey}.isOpen`}
                                render={({ field }) => (
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id={`${dayKey}.isOpen`}
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            disabled={isSubmitting}
                                        />
                                        <label htmlFor={`${dayKey}.isOpen`} className="text-sm">
                                            {field.value ? 'Aberto' : 'Fechado'}
                                        </label>
                                    </div>
                                )}
                            />
                        </div>
                        <div className={cn("grid grid-cols-2 gap-4", !isDayOpen && "pointer-events-none opacity-50")}>
                            <Input
                                type="time"
                                {...register(`${dayKey}.open`)}
                                disabled={isSubmitting || !isDayOpen}
                            />
                            <Input
                                type="time"
                                {...register(`${dayKey}.close`)}
                                disabled={isSubmitting || !isDayOpen}
                            />
                        </div>
                    </div>
                )
             })}
            </div>
        </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="animate-spin" /> : 'Salvar Informações'}
      </Button>
    </form>
  );
}

export default function MyTentPage() {
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();

  const tentQuery = useMemoFirebase(
    () => (user && firestore) ? query(collection(firestore, 'tents'), where('ownerId', '==', user.uid), limit(1)) : null,
    [firestore, user]
  );
  const { data: tents, isLoading: loadingTent, refresh: refreshTent } = useCollection<Tent>(tentQuery);
  const tent = tents?.[0] || null;
  

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

  const handleFinished = () => {
    if (refreshTent) {
      refreshTent();
    }
  }

  return (
    <div className="w-full max-w-2xl space-y-8">
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
          <TentForm user={user} existingTent={tent} onFinished={handleFinished} />
        </CardContent>
      </Card>
      
    </div>
  );
}
