'use client';

import { useUser } from '@/firebase/provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Building, MapPin, CheckCircle2, Clock } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import type { Tent, OperatingHours } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { mockTents } from '@/lib/mock-data';

const operatingHoursSchema = z.object({
  isOpen: z.boolean(),
  open: z.string(),
  close: z.string(),
});

const tentSchema = z.object({
  name: z.string().min(3, 'O nome da barraca é obrigatório.'),
  description: z.string().min(10, 'A descrição é obrigatória.'),
  beachName: z.string().min(3, 'O nome da praia é obrigatório.'),
  minimumOrderForFeeWaiver: z.preprocess((a) => (a ? parseFloat(z.string().parse(a)) : null), z.number().nullable()),
  location: z.object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }).optional(),
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

type TentFormData = z.infer<typeof tentSchema>;

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

function TentForm({ user, existingTent, onFinished }: { user: any; existingTent?: Tent | null; onFinished: () => void }) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue, watch, control, reset } = useForm<TentFormData>({
    resolver: zodResolver(tentSchema),
    defaultValues: {
      name: '',
      description: '',
      beachName: '',
      minimumOrderForFeeWaiver: null,
      location: { latitude: undefined, longitude: undefined },
      operatingHours: defaultOperatingHours,
    },
  });

  useEffect(() => {
    if (existingTent) {
      reset({
        name: existingTent.name || '',
        description: existingTent.description || '',
        beachName: existingTent.beachName || '',
        minimumOrderForFeeWaiver: existingTent.minimumOrderForFeeWaiver || null,
        location: existingTent.location || { latitude: undefined, longitude: undefined },
        operatingHours: existingTent.operatingHours || defaultOperatingHours,
      });
    } else {
        reset({
            name: '',
            description: '',
            beachName: '',
            minimumOrderForFeeWaiver: null,
            location: { latitude: undefined, longitude: undefined },
            operatingHours: defaultOperatingHours,
        })
    }
  }, [existingTent, reset]);
  
  const daysOfWeek = [
      { id: 'sunday', label: 'Domingo' },
      { id: 'monday', label: 'Segunda-feira' },
      { id: 'tuesday', label: 'Terça-feira' },
      { id: 'wednesday', label: 'Quarta-feira' },
      { id: 'thursday', label: 'Quinta-feira' },
      { id: 'friday', label: 'Sexta-feira' },
      { id: 'saturday', label: 'Sábado' },
  ] as const;

  const watchedLocation = watch('location');
  const hasLocation = watchedLocation?.latitude && watchedLocation?.longitude;

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

  const onSubmit = (data: TentFormData) => {
    setIsSubmitting(true);
    setTimeout(() => {
        toast({
            title: `Barraca ${existingTent ? 'atualizada' : 'cadastrada'}! (Demonstração)`,
            description: 'Suas informações foram salvas.',
        });
        setIsSubmitting(false);
        onFinished();
    }, 1000);
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
            {errors.location && <p className="text-sm text-destructive">Por favor, use o botão de GPS para definir a localização.</p>}
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
  const [tent, setTent] = useState<Tent | null>(null);
  const [loadingTent, setLoadingTent] = useState(true);

  const fetchTentData = useCallback(() => {
    if (!user) {
        setLoadingTent(false);
        return;
    };
    setLoadingTent(true);
    setTimeout(() => {
        // For demo, we imagine the owner is 'owner1'
        const ownerTent = mockTents.find(t => t.ownerId === 'owner1');
        setTent(ownerTent || null);
        setLoadingTent(false);
    }, 500);
  }, [user]);

  useEffect(() => {
    if (!isUserLoading && user) {
        fetchTentData();
    } else if (!isUserLoading) {
        setLoadingTent(false);
    }
  }, [user, isUserLoading, fetchTentData]);


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
