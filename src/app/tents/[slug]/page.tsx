
'use client';

import { notFound, useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Armchair, Minus, Plus, Info, Loader2, AlertTriangle, Clock, ShoppingCart, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useMemo, useState, useEffect } from 'react';
import { useUser } from '@/firebase/provider';
import { useFirebase } from '@/firebase/provider';
import { addDoc, collection, query, where, getDocs, serverTimestamp, limit } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Link from 'next/link';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { Tent, OperatingHoursDay, Reservation } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { MenuItem, RentalItem, ReservationItem } from '@/lib/types';
import { useMemoFirebase } from '@/firebase/provider';
import { tentBannerUrl } from '@/lib/placeholder-images';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

type CartItem = { 
    item: MenuItem | RentalItem; 
    quantity: number,
    type: 'menu' | 'rental' 
};

const daysOfWeekMap: Record<string, string> = {
  sunday: 'Domingo',
  monday: 'Segunda-feira',
  tuesday: 'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday: 'Quinta-feira',
  friday: 'Sexta-feira',
  saturday: 'Sábado',
};

const dayOrder = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];


function OperatingHoursDisplay({ hours }: { hours: Tent['operatingHours'] }) {
    if (!hours) return <p className="text-sm text-muted-foreground">Horário de funcionamento não informado.</p>;

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    return (
        <div className="space-y-2 text-sm">
            {dayOrder.map(day => {
                const dayInfo = hours[day as keyof typeof hours] as OperatingHoursDay;
                if (!dayInfo) return null;

                return (
                    <div key={day} className={cn("flex justify-between", day === today && "font-bold text-primary")}>
                        <span>{daysOfWeekMap[day]}</span>
                        <span>
                            {dayInfo.isOpen ? `${dayInfo.open} - ${dayInfo.close}` : 'Fechado'}
                        </span>
                    </div>
                )
            })}
        </div>
    );
}

export default function TentPage({ params }: { params: { slug: string } }) {
  const { firestore } = useFirebase();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  
  const [tent, setTent] = useState<Tent | null>(null);
  const [loadingTent, setLoadingTent] = useState(true);
  const [reservationTime, setReservationTime] = useState<string>('');
  const [activeTab, setActiveTab] = useState('reserve');

  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [hasActiveReservation, setHasActiveReservation] = useState(false);
  const [loadingActiveReservation, setLoadingActiveReservation] = useState(true);

  useEffect(() => {
    const checkActiveReservation = async () => {
      if (!user || !firestore) {
        setLoadingActiveReservation(false);
        return;
      }
      setLoadingActiveReservation(true);
      const activeStatuses: Reservation['status'][] = ['confirmed', 'checked-in', 'payment-pending'];
      const q = query(
        collection(firestore, 'reservations'),
        where('userId', '==', user.uid),
        where('status', 'in', activeStatuses),
        limit(1)
      );

      try {
        const querySnapshot = await getDocs(q);
        setHasActiveReservation(!querySnapshot.empty);
      } catch (error) {
        console.error("Error checking for active reservation:", error);
        setHasActiveReservation(false);
      } finally {
        setLoadingActiveReservation(false);
      }
    };

    if (!isUserLoading) {
        checkActiveReservation();
    }
  }, [user, firestore, isUserLoading]);


  useEffect(() => {
    if (!firestore || !params.slug) return;

    const fetchTent = async () => {
        setLoadingTent(true);
        const slug = params.slug;
        const tentQuery = query(collection(firestore, 'tents'), where('slug', '==', slug));
        try {
            const querySnapshot = await getDocs(tentQuery);
            if (querySnapshot.empty) {
                notFound();
            } else {
                const tentDoc = querySnapshot.docs[0];
                const tentData = { id: tentDoc.id, ...tentDoc.data() } as Tent;

                setTent(tentData);
            }
        } catch (error) {
            console.error("Error fetching tent:", error);
            notFound();
        } finally {
            setLoadingTent(false);
        }
    };
    fetchTent();
  }, [firestore, params.slug]);


  const menuQuery = useMemoFirebase(() => {
    if (!tent || !firestore) return null;
    return collection(firestore, 'tents', tent.id, 'menuItems');
  }, [tent, firestore]);

  const rentalsQuery = useMemoFirebase(() => {
    if (!tent || !firestore) return null;
    return collection(firestore, 'tents', tent.id, 'rentalItems');
  }, [tent, firestore]);
  
  const { data: menuItems, isLoading: loadingMenu } = useCollection<MenuItem>(menuQuery);
  const { data: rentalItems, isLoading: loadingRentals } = useCollection<RentalItem>(rentalsQuery);
  
  const rentalKit = useMemo(() => rentalItems?.find(item => item.name === "Kit Guarda-sol + 2 Cadeiras"), [rentalItems]);
  const additionalChair = useMemo(() => rentalItems?.find(item => item.name === "Cadeira Adicional"), [rentalItems]);


  if (loadingTent || isUserLoading || loadingActiveReservation || !tent) {
    return (
       <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Carregando barraca...</p>
      </div>
    );
  }

  const menuByCategory = (menuItems || []).reduce((acc, item) => {
    const category = item.category || 'Outros';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  const handleQuantityChange = (
    item: MenuItem | RentalItem,
    type: 'menu' | 'rental',
    change: number
  ) => {
    setCart((prev) => {
      const existing = prev[item.id] || { item, quantity: 0, type };
      let newQuantity = Math.max(0, existing.quantity + change);

      if (type === 'rental') {
        const rentalItem = item as RentalItem;
        
        if (rentalItem.quantity) {
          newQuantity = Math.min(newQuantity, rentalItem.quantity);
        }
        if (rentalItem.name === 'Kit Guarda-sol + 2 Cadeiras') {
            newQuantity = Math.min(newQuantity, 3);
        }
        if (rentalItem.name === 'Cadeira Adicional') {
            newQuantity = Math.min(newQuantity, 3);
        }
      }

      if (newQuantity === 0) {
        const { [item.id]: _, ...rest } = prev;
        
        if (item.id === rentalKit?.id) {
           if (additionalChair?.id) {
            const { [additionalChair.id]: __, ...finalRest } = rest;
            return finalRest;
           }
        }

        return rest;
      }

      return {
        ...prev,
        [item.id]: { ...existing, quantity: newQuantity },
      };
    });
  };

  const rentalTotal = Object.values(cart).filter(i => i.type === 'rental').reduce((acc, { item, quantity }) => acc + item.price * quantity, 0);
  const menuTotal = Object.values(cart).filter(i => i.type === 'menu').reduce((acc, { item, quantity }) => acc + item.price * quantity, 0);
  const hasRentalKitInCart = rentalKit && cart[rentalKit.id] && cart[rentalKit.id].quantity > 0;
  
  const kitsInCart = (rentalKit && cart[rentalKit.id]?.quantity) || 0;
  const baseFeeWaiverAmount = tent.minimumOrderForFeeWaiver || 0;
  const proportionalFeeWaiverAmount = baseFeeWaiverAmount * kitsInCart;
  
  const isFeeWaived = proportionalFeeWaiverAmount > 0 && rentalTotal > 0 && menuTotal >= proportionalFeeWaiverAmount;
  
  const finalTotal = isFeeWaived ? menuTotal : menuTotal + rentalTotal;
  
  const isCartEmpty = Object.keys(cart).length === 0;

  const handleProceedToMenu = () => {
    if (!hasRentalKitInCart) {
        toast({
            variant: "destructive",
            title: "Aluguel Obrigatório",
            description: "Você precisa alugar pelo menos um 'Kit Guarda-sol + 2 Cadeiras' para fazer uma reserva.",
        });
        return;
    }
    
    if (!reservationTime) {
        toast({
            variant: "destructive",
            title: "Horário Obrigatório",
            description: "Por favor, selecione um horário para a sua reserva.",
        });
        return;
    }
    setActiveTab('menu');
  }

  const handleCreateReservation = async () => {
    if (!user) {
        toast({
            variant: "destructive",
            title: "Login Necessário",
            description: "Você precisa estar logado para fazer um pedido.",
        });
        router.push(`/login?redirect=/tents/${tent.slug}`);
        return;
    }
    
    if (hasActiveReservation) {
        toast({
            variant: "destructive",
            title: "Reserva Ativa Encontrada",
            description: "Você já possui uma reserva ativa. Finalize-a antes de criar uma nova.",
        });
        router.push('/dashboard/my-reservations');
        return;
    }

    if (!hasRentalKitInCart) {
        toast({
            variant: "destructive",
            title: "Aluguel Obrigatório",
            description: "Você precisa alugar um 'Kit Guarda-sol + 2 Cadeiras' para fazer uma reserva.",
        });
        return;
    }
    
    if (!reservationTime) {
        toast({
            variant: "destructive",
            title: "Horário Obrigatório",
            description: "Por favor, selecione um horário para a sua reserva.",
        });
        return;
    }
    
    if (!firestore) return;
    
    setIsSubmitting(true);

    const orderNumber = Math.floor(100000 + Math.random() * 900000).toString();
    const checkinCode = Math.floor(1000 + Math.random() * 9000).toString();

    const reservationData = {
      userId: user.uid,
      userName: user.displayName,
      tentId: tent.id,
      tentOwnerId: tent.ownerId,
      tentName: tent.name,
      tentOwnerName: tent.ownerName,
      tentLocation: tent.location,
      items: Object.values(cart).map(({ item, quantity }) => ({
        itemId: item.id,
        name: item.name,
        price: item.price,
        quantity: quantity,
        status: 'confirmed', 
      } as ReservationItem)),
      total: finalTotal,
      createdAt: serverTimestamp(),
      reservationTime: reservationTime,
      orderNumber: orderNumber,
      checkinCode: checkinCode,
      status: 'confirmed',
    };

    try {
        const reservationsColRef = collection(firestore, 'reservations');
        await addDoc(reservationsColRef, reservationData);
        toast({
            title: "Reserva Confirmada!",
            description: `Sua reserva na ${tent.name} foi criada com sucesso.`,
        });
        router.push('/dashboard/my-reservations');
    } catch (error: any) {
        const permissionError = new FirestorePermissionError({
            path: 'reservations',
            operation: 'create',
            requestResourceData: reservationData,
        });
        errorEmitter.emit('permission-error', permissionError);
        if (error.code !== 'permission-denied') {
            toast({ variant: 'destructive', title: 'Erro ao criar reserva' });
        }
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <div className="relative h-64 w-full md:h-96">
            <Image
                src={tentBannerUrl}
                alt={tent.name}
                className="object-cover"
                data-ai-hint="beach umbrella"
                fill
                priority
            />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 p-8 text-white">
            <h1 className="text-4xl font-extrabold drop-shadow-lg md:text-6xl">{tent.name}</h1>
            <p className="mt-2 max-w-2xl text-lg drop-shadow-md">{tent.description}</p>
          </div>
        </div>

        <div className="container mx-auto max-w-7xl px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-8">
            <div className="lg:col-span-2">
                 <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 md:w-[600px]">
                        <TabsTrigger value="reserve">Aluguel e Horário</TabsTrigger>
                        <TabsTrigger value="menu">Cardápio</TabsTrigger>
                         <TabsTrigger value="info">Informações</TabsTrigger>
                    </TabsList>
                     <TabsContent value="menu" className="mt-6">
                        <Card>
                            <CardHeader>
                            <CardTitle>Nosso Cardápio</CardTitle>
                            <CardDescription>Escolha seus pratos e bebidas favoritos.</CardDescription>
                             {tent.minimumOrderForFeeWaiver && tent.minimumOrderForFeeWaiver > 0 && (
                                <div className="mt-4 flex items-center gap-3 rounded-lg bg-primary/10 p-3 text-sm text-primary-foreground">
                                    <Info className="h-5 w-5 text-primary"/>
                                    <div>
                                    <span className="font-semibold">Aluguel grátis!</span> Peça a partir de <span className="font-bold">R$ {proportionalFeeWaiverAmount > 0 ? proportionalFeeWaiverAmount.toFixed(2) : baseFeeWaiverAmount.toFixed(2)}</span> em consumo e ganhe a isenção da taxa de aluguel.
                                    </div>
                                </div>
                            )}
                            </CardHeader>
                            <CardContent>
                            {loadingMenu ? <Loader2 className="mx-auto my-8 h-8 w-8 animate-spin text-primary" /> : (
                            <Accordion type="multiple" defaultValue={Object.keys(menuByCategory)} className="w-full">
                                {Object.entries(menuByCategory).map(([category, items]) => (
                                <AccordionItem key={category} value={category}>
                                    <AccordionTrigger className="text-lg font-semibold">{category}</AccordionTrigger>
                                    <AccordionContent>
                                    <div className="space-y-4 pt-2">
                                        {items.map((item) => (
                                        <div key={item.id} className="flex items-center justify-between">
                                            <div>
                                            <p className="font-medium">{item.name}</p>
                                            <p className="text-sm text-muted-foreground">{item.description}</p>
                                            <p className="text-sm font-bold text-primary">R$ {item.price.toFixed(2)}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange(item, 'menu', -1)} disabled={isSubmitting}><Minus className="h-4 w-4"/></Button>
                                                <Input type="number" readOnly value={cart[item.id]?.quantity || 0} className="h-8 w-12 text-center" disabled={isSubmitting}/>
                                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange(item, 'menu', 1)} disabled={isSubmitting}><Plus className="h-4 w-4"/></Button>
                                            </div>
                                        </div>
                                        ))}
                                    </div>
                                    </AccordionContent>
                                </AccordionItem>
                                ))}
                            </Accordion>
                            )}
                            </CardContent>
                        </Card>
                        </TabsContent>

                        <TabsContent value="reserve" className="mt-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Aluguel de Itens e Horário</CardTitle>
                                    <CardDescription>Para reservar, é obrigatório o aluguel do kit e a seleção de um horário para hoje. { !user && <Link href={`/login?redirect=/tents/${tent.slug}`} className="text-primary underline font-medium">Faça login para alugar</Link>}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="reservation-time" className="flex items-center gap-2"><Clock className="w-4 h-4"/> Horário da Reserva</Label>
                                    <Input id="reservation-time" type="time" value={reservationTime} onChange={e => setReservationTime(e.target.value)} disabled={isSubmitting}/>
                                    <p className="text-xs text-muted-foreground">Reservas são apenas para o dia de hoje. Há uma tolerância de 15 minutos para o check-in.</p>
                                </div>

                                {loadingRentals ? <Loader2 className="mx-auto my-8 h-8 w-8 animate-spin text-primary" /> : rentalItems && rentalItems.length > 0 ? (
                                    <>
                                        {rentalKit && (
                                            <div className="flex flex-col rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                                                <div>
                                                    <h3 className="flex items-center gap-2 text-lg font-semibold">
                                                        <Armchair className="h-5 w-5"/>
                                                        {rentalKit.name}
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground">Disponível: {rentalKit.quantity - (cart[rentalKit.id]?.quantity || 0)}</p>
                                                    <p className="text-2xl font-bold text-primary">R$ {rentalKit.price.toFixed(2)}</p>
                                                </div>
                                                <div className="mt-4 flex items-center gap-2 sm:mt-0">
                                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange(rentalKit, 'rental', -1)} disabled={isSubmitting}><Minus className="h-4 w-4"/></Button>
                                                    <Input type="number" readOnly value={cart[rentalKit.id]?.quantity || 0} className="h-8 w-16 text-center" disabled={isSubmitting}/>
                                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange(rentalKit, 'rental', 1)} disabled={isSubmitting || (cart[rentalKit.id]?.quantity || 0) >= rentalKit.quantity || (cart[rentalKit.id]?.quantity || 0) >= 3}><Plus className="h-4 w-4"/></Button>
                                                </div>
                                            </div>
                                        )}
                                        {additionalChair && (
                                             <div className={cn("flex flex-col rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between transition-opacity", !hasRentalKitInCart && "opacity-50 pointer-events-none")}>
                                                <div>
                                                    <h3 className="flex items-center gap-2 text-lg font-semibold">
                                                        <Armchair className="h-5 w-5"/>
                                                        {additionalChair.name}
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground">Disponível: {additionalChair.quantity - (cart[additionalChair.id]?.quantity || 0)}</p>
                                                    <p className="text-xl font-bold text-primary">R$ {additionalChair.price.toFixed(2)}</p>
                                                </div>
                                                <div className="mt-4 flex items-center gap-2 sm:mt-0">
                                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange(additionalChair, 'rental', -1)} disabled={isSubmitting || !hasRentalKitInCart}><Minus className="h-4 w-4"/></Button>
                                                    <Input type="number" readOnly value={cart[additionalChair.id]?.quantity || 0} className="h-8 w-16 text-center" disabled={isSubmitting || !hasRentalKitInCart}/>
                                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange(additionalChair, 'rental', 1)} disabled={isSubmitting || !hasRentalKitInCart || (cart[additionalChair.id]?.quantity || 0) >= additionalChair.quantity || (cart[additionalChair.id]?.quantity || 0) >= 3}><Plus className="h-4 w-4"/></Button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                    ) : (
                                        <p className="text-muted-foreground text-center">Nenhum item de aluguel disponível no momento.</p>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                         <TabsContent value="info" className="mt-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Horário de Funcionamento</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <OperatingHoursDisplay hours={tent.operatingHours} />
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
            </div>
            <div className="lg:col-span-1 mt-8 lg:mt-0">
                <Card className="sticky top-24">
                    <CardHeader>
                        <CardTitle>Sua Reserva</CardTitle>
                        <CardDescription>Revise seus itens antes de fazer a reserva.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isCartEmpty ? (
                            <p className="text-center text-muted-foreground">Seu carrinho está vazio.</p>
                        ) : (
                           <ul className="space-y-2 text-sm text-muted-foreground">
                                {Object.values(cart).map(({ item, quantity, type }) => (
                                     <li key={`${item.id}-${type}`} className="flex justify-between">
                                        <span>{quantity}x {item.name}</span>
                                        <span>R$ {(item.price * quantity).toFixed(2)}</span>
                                    </li>
                                ))}
                           </ul>
                        )}
                        <div className="border-t pt-4 space-y-2">
                           <div className="flex justify-between text-sm">
                               <span>Consumo</span>
                               <span>R$ {menuTotal.toFixed(2)}</span>
                           </div>
                           <div className="flex justify-between text-sm">
                               <span>Aluguel</span>
                               <span className={cn(isFeeWaived && "line-through")}>R$ {rentalTotal.toFixed(2)}</span>
                           </div>
                            {isFeeWaived && (
                                <div className="flex justify-between text-sm font-semibold text-primary">
                                    <span>Isenção de Aluguel</span>
                                    <span>- R$ {rentalTotal.toFixed(2)}</span>
                                </div>
                           )}
                        </div>

                    </CardContent>
                     <CardFooter className="flex-col items-stretch gap-4">
                         <div className="flex justify-between items-baseline">
                            <p className="text-sm text-muted-foreground">Total</p>
                            <p className="text-2xl font-bold">R$ {finalTotal.toFixed(2)}</p>
                        </div>
                        
                        {hasActiveReservation ? (
                            <div className="p-3 bg-destructive/10 rounded-md text-center text-sm text-destructive-foreground">
                                <AlertTriangle className="mx-auto mb-2 h-5 w-5 text-destructive" />
                                <p className="font-semibold">Você já tem uma reserva ativa.</p>
                                <p>Finalize sua reserva atual para poder criar uma nova.</p>
                                <Button asChild variant="link" className="text-destructive p-0 h-auto mt-1">
                                    <Link href="/dashboard/my-reservations">Ver Minhas Reservas</Link>
                                </Button>
                            </div>
                        ) : activeTab === 'reserve' ? (
                             <Button size="lg" className="w-full" onClick={handleProceedToMenu} disabled={!hasRentalKitInCart || isSubmitting}>
                                {isSubmitting ? <Loader2 className="animate-spin" /> : <>Próximo Passo <ArrowRight className="ml-2" /></>}
                            </Button>
                        ) : (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button size="lg" className="w-full" disabled={!hasRentalKitInCart || isSubmitting}>
                                        {isSubmitting ? <Loader2 className="animate-spin" /> : <>Fazer Reserva <ShoppingCart className="ml-2" /></>}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Aviso de Tolerância</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Lembre-se: você tem uma tolerância de 15 minutos a partir do horário agendado para fazer o check-in. Após esse período, o dono da barraca poderá cancelar sua reserva.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Voltar</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleCreateReservation}>
                                            Confirmar Reserva
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </CardFooter>
                </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
