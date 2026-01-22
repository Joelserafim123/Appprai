'use client';

import { notFound, useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Armchair, Minus, Plus, Info, Loader2, AlertTriangle, Clock, ShoppingCart, ArrowRight, MessageSquare, Utensils } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useMemo, useState, useEffect } from 'react';
import { useUser, useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import type { Tent, OperatingHoursDay, Reservation } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { MenuItem, RentalItem } from '@/lib/types';
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
import { Header } from '@/components/layout/header';
import { collection, query, where, limit, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';


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

export default function TentPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const { db } = useFirebase();
  const { toast } = useToast();
  
  const [reservationTime, setReservationTime] = useState<string>('');
  const [activeTab, setActiveTab] = useState('reserve');

  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  
  // Fetch Tent
  const tentQuery = useMemoFirebase(() => slug ? query(collection(db, 'tents'), where('slug', '==', slug), limit(1)) : null, [db, slug]);
  const { data: tents, isLoading: loadingTent } = useCollection<Tent>(tentQuery);
  const tent = tents?.[0];

  // Fetch Menu and Rental Items
  const menuItemsQuery = useMemoFirebase(() => tent ? collection(db, 'tents', tent.id, 'menuItems') : null, [db, tent]);
  const { data: menuItems, isLoading: loadingMenu } = useCollection<MenuItem>(menuItemsQuery);
  
  const rentalItemsQuery = useMemoFirebase(() => tent ? collection(db, 'tents', tent.id, 'rentalItems') : null, [db, tent]);
  const { data: rentalItems, isLoading: loadingRentals } = useCollection<RentalItem>(rentalItemsQuery);

  // Check for active reservations
  const activeReservationQuery = useMemoFirebase(() => user ? query(collection(db, 'reservations'), where('userId', '==', user.uid), where('status', 'in', ['confirmed', 'checked-in', 'payment-pending'])) : null, [db, user]);
  const { data: activeReservations, isLoading: loadingActiveReservation } = useCollection<Reservation>(activeReservationQuery);
  const hasActiveReservation = useMemo(() => activeReservations && activeReservations.length > 0, [activeReservations]);


  const rentalKit = useMemo(() => rentalItems?.find(item => item.name === "Kit Guarda-sol + 2 Cadeiras"), [rentalItems]);
  const additionalChair = useMemo(() => rentalItems?.find(item => item.name === "Cadeira Adicional"), [rentalItems]);


  if (loadingTent || isUserLoading || loadingActiveReservation) {
    return (
       <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Carregando barraca...</p>
      </div>
    );
  }
  
  if(!tent) {
    notFound();
  }

  const isOwnerViewingOwnTent = user && user.uid === tent.ownerId;

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
    if (!user || user.isAnonymous) {
        toast({
            variant: "destructive",
            title: "Login Necessário",
            description: "Você precisa estar logado para fazer um pedido.",
        });
        router.push(`/login?redirect=/tents/${slug}`);
        return;
    }
    
    if (user.uid === tent.ownerId) {
       toast({
        variant: "destructive",
        title: "Ação não permitida",
        description: "Você não pode fazer uma reserva na sua própria barraca.",
      });
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
    
    setIsSubmitting(true);

    try {
        const reservationData = {
            userId: user.uid,
            userName: user.displayName,
            userPhotoURL: user.photoURL || null,
            tentId: tent.id,
            tentName: tent.name,
            tentOwnerId: tent.ownerId,
            tentOwnerName: tent.ownerName,
            tentLogoUrl: tent.logoUrl || null,
            tentLocation: tent.location,
            items: Object.values(cart).map(({ item, quantity }) => ({
                itemId: item.id,
                name: item.name,
                price: item.price,
                quantity: quantity,
                status: 'confirmed'
            })),
            total: finalTotal,
            createdAt: serverTimestamp(),
            reservationTime,
            orderNumber: Math.random().toString(36).substr(2, 6).toUpperCase(),
            checkinCode: Math.floor(1000 + Math.random() * 9000).toString(),
            status: 'confirmed',
            participantIds: [user.uid, tent.ownerId],
        };

        await addDoc(collection(db, 'reservations'), reservationData);
        
        toast({
            title: "Reserva Confirmada!",
            description: `Sua reserva na ${tent.name} foi criada com sucesso.`,
        });
        router.push('/dashboard/my-reservations');

    } catch(error) {
        console.error("Error creating reservation: ", error);
        toast({
            variant: 'destructive',
            title: "Erro ao criar reserva",
            description: "Não foi possível completar sua reserva. Tente novamente."
        })
    } finally {
        setIsSubmitting(false);
    }
  };
  
    const handleStartChat = async () => {
    if (!user || user.isAnonymous) {
      toast({
        variant: 'destructive',
        title: 'Login Necessário',
        description: 'Você precisa estar logado para iniciar uma conversa.',
      });
      router.push(`/login?redirect=/tents/${slug}`);
      return;
    }
    if (!tent) return;

    setIsCreatingChat(true);

    try {
      const chatsRef = collection(db, 'chats');
      const q = query(
        chatsRef,
        where('userId', '==', user.uid),
        where('tentId', '==', tent.id)
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        router.push('/dashboard/chats');
      } else {
        await addDoc(chatsRef, {
          userId: user.uid,
          userName: user.displayName,
          userPhotoURL: user.photoURL || null,
          tentId: tent.id,
          tentName: tent.name,
          tentOwnerId: tent.ownerId,
          tentLogoUrl: tent.logoUrl || null,
          lastMessage: `Conversa iniciada...`,
          lastMessageTimestamp: serverTimestamp(),
          participantIds: [user.uid, tent.ownerId],
        });
        router.push('/dashboard/chats');
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao iniciar conversa',
        description: 'Não foi possível iniciar a conversa. Tente novamente.',
      });
    } finally {
      setIsCreatingChat(false);
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
                                {loadingMenu ? (
                                    <Loader2 className="mx-auto my-8 h-8 w-8 animate-spin text-primary" />
                                ) : menuItems && menuItems.length > 0 ? (
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
                                ) : (
                                    <div className="py-12 text-center text-muted-foreground">
                                        <Utensils className="mx-auto h-10 w-10" />
                                        <h3 className="mt-4 text-lg font-semibold text-card-foreground">Cardápio Indisponível</h3>
                                        <p className="mt-1 text-sm">Esta barraca ainda não cadastrou itens no cardápio.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        </TabsContent>

                        <TabsContent value="reserve" className="mt-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Aluguel de Itens e Horário</CardTitle>
                                    <CardDescription>Para reservar, é obrigatório o aluguel do kit e a seleção de um horário para hoje. { user?.isAnonymous && <Link href={`/login?redirect=/tents/${slug}`} className="text-primary underline font-medium">Faça login para alugar</Link>}</CardDescription>
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
                                    <CardTitle>Informações</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                     <div>
                                        <h3 className="font-semibold flex items-center gap-2"><Clock className="w-4 h-4" /> Horário de Funcionamento</h3>
                                        <OperatingHoursDisplay hours={tent.operatingHours} />
                                    </div>
                                    <div className="pt-4 border-t">
                                        <Button 
                                            className="w-full" 
                                            onClick={handleStartChat} 
                                            disabled={isCreatingChat || isOwnerViewingOwnTent || user?.isAnonymous}
                                        >
                                            {isCreatingChat ? <Loader2 className="animate-spin" /> : <MessageSquare className="mr-2" />}
                                            Contactar Barraca
                                        </Button>
                                        {isOwnerViewingOwnTent && <p className="text-xs text-center text-muted-foreground mt-2">Você não pode iniciar uma conversa com a sua própria barraca.</p>}
                                        {user?.isAnonymous && <p className="text-xs text-center text-muted-foreground mt-2">Faça <Link href={`/login?redirect=/tents/${slug}`} className="underline font-medium">login</Link> para contactar a barraca.</p>}
                                    </div>
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
                        ) : isOwnerViewingOwnTent ? (
                            <div className="p-3 bg-muted rounded-md text-center text-sm text-muted-foreground">
                                <Info className="mx-auto mb-2 h-5 w-5" />
                                <p className="font-semibold">Esta é a sua barraca.</p>
                                <p>Você não pode fazer uma reserva na sua própria barraca.</p>
                                <Button asChild variant="link" className="text-primary p-0 h-auto mt-1">
                                    <Link href="/dashboard">Ir para o Painel</Link>
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
