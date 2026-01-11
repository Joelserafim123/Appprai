
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

type Location = {
    lat: number;
    lng: number;
}

const tentSchema = z.object({
  name: z.string().min(3, 'O nome da barraca é obrigatório.'),
  description: z.string().min(10, 'A descrição é obrigatória.'),
  location: z.object({
    lat: z.preprocess((a) => parseFloat(z.string().parse(a)), z.number().min(-90).max(90)),
    lng: z.preprocess((a) => parseFloat(z.string().parse(a)), z.number().min(-180).max(180)),
  }),
  minimumOrderForFeeWaiver: z.preprocess((a) => (a ? parseFloat(z.string().parse(a)) : null), z.number().nullable()),
});

type TentFormData = z.infer<typeof tentSchema>;

function TentForm({ user, existingTent, onFinished, currentLocation, locationError }: { user: any; existingTent?: Tent | null; onFinished: () => void, currentLocation: Location | null, locationError: string | null }) {
  const { db } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<TentFormData>({
    resolver: zodResolver(tentSchema),
    defaultValues: {
      name: existingTent?.name || '',
      description: existingTent?.description || '',
      location: existingTent?.location || currentLocation || { lat: 0, lng: 0 },
      minimumOrderForFeeWaiver: existingTent?.minimumOrderForFeeWaiver || 0,
    },
  });

  useEffect(() => {
    if (currentLocation && !existingTent?.location) { // Only set current location if there's no existing one
      setValue('location.lat', currentLocation.lat);
      setValue('location.lng', currentLocation.lng);
    }
  }, [currentLocation, setValue, existingTent]);

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
      {locationError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro de Localização</AlertTitle>
          <AlertDescription>{locationError}</AlertDescription>
        </Alert>
      )}
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
      <div>
        <div className="flex items-center justify-between mb-2">
            <Label>Localização (preenchida automaticamente)</Label>
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
            <Label htmlFor="lat">Latitude</Label>
            <Input id="lat" type="number" step="any" {...register('location.lat')} readOnly disabled={isSubmitting} />
            {errors.location?.lat && <p className="text-sm text-destructive">{errors.location.lat.message}</p>}
            </div>
            <div className="space-y-2">
            <Label htmlFor="lng">Longitude</Label>
            <Input id="lng" type="number" step="any" {...register('location.lng')} readOnly disabled={isSubmitting} />
            {errors.location?.lng && <p className="text-sm text-destructive">{errors.location.lng.message}</p>}
            </div>
        </div>
        {!currentLocation && !locationError && <p className="text-xs text-muted-foreground mt-2">Aguardando localização... Habilite o GPS no seu navegador.</p>}
      </div>
       <div className="space-y-2">
          <Label htmlFor="minimumOrderForFeeWaiver">Valor Mínimo para Isenção de Aluguel (R$)</Label>
          <Input id="minimumOrderForFeeWaiver" type="number" step="0.01" {...register('minimumOrderForFeeWaiver')} disabled={isSubmitting} />
          <p className="text-xs text-muted-foreground">Deixe 0 se não houver isenção.</p>
           {errors.minimumOrderForFeeWaiver && <p className="text-sm text-destructive">{errors.minimumOrderForFeeWaiver.message}</p>}
        </div>
      <Button type="submit" className="w-full" disabled={isSubmitting || !currentLocation}>
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
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchTentData = async () => {
    if (!db || !user) return;
    setLoadingTent(true);
    const tentsRef = collection(db, 'tents');
    const q = query(tentsRef, where('ownerId', '==', user.uid));
    try {
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            const tentData = { id: doc.id, ...doc.data() } as Tent;
            setTent(tentData);
            if (tentData.location) {
                // If a location is already saved, use it as the current location.
                setCurrentLocation(tentData.location);
            }
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

  useEffect(() => {
    // This effect runs only once to get the user's location.
    if (tent?.location) return; // Don't fetch if location is already set from DB

    setLocationError(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCurrentLocation(newLocation);
          toast({ title: 'Localização obtida com sucesso!' });
        },
        (error) => {
          let errorMsg = 'Não foi possível obter sua localização. Verifique as permissões do navegador e tente novamente.';
          if (error.code === error.PERMISSION_DENIED) {
            errorMsg = 'A permissão de localização foi negada. Você precisa habilitá-la nas configurações do seu navegador para cadastrar uma barraca.';
          }
          setLocationError(errorMsg);
          toast({ variant: 'destructive', title: 'Erro de Localização', description: errorMsg, duration: 10000 });
        },
        { enableHighAccuracy: true }
      );
    } else {
      const errorMsg = 'Geolocalização não é suportada por este navegador.';
      setLocationError(errorMsg);
      toast({ variant: 'destructive', title: 'Erro de Localização', description: errorMsg });
    }
  }, [tent]);

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
          <TentForm user={user} existingTent={tent} onFinished={fetchTentData} currentLocation={currentLocation} locationError={locationError} />
        </CardContent>
      </Card>
    </div>
  );

}
