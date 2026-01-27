'use client';

import { notFound, useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Info, Loader2, AlertTriangle, Clock, Star, User as UserIcon, Calendar as CalendarIcon, Heart } from 'lucide-react';
import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useUser, useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import type { Tent, OperatingHoursDay, Reservation, Review, Chat, MenuItem, RentalItem, ReservationWrite, ChatWrite } from '@/lib/types';
import { cn, getInitials } from '@/lib/utils';
import { tentBannerUrl } from '@/lib/placeholder-images';
import { Label } from '@/components/ui/label';
import { Header } from '@/components/layout/header';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { collection, query, where, addDoc, serverTimestamp, getDocs, doc, writeBatch, updateDoc, arrayUnion, arrayRemove, orderBy } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTranslations } from '@/i18n';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, addDays, getDay, set } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useCartStore, useCartActions } from '@/hooks/use-cart-store';
import { CartSummary } from '@/components/tents/cart-summary';
import { RentalList } from '@/components/tents/rental-list';
import { MenuList } from '@/components/tents/menu-list';


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
  const tentId = params.id as string;
  const router = useRouter();
  const { user, isUserLoading, refresh } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  const [reservationDate, setReservationDate] = useState<Date | undefined>();
  const [reservationTime, setReservationTime] = useState<string>('');
  const [activeTab, setActiveTab] = useState('reserve');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFavoriting, setIsFavoriting] = useState(false);

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const timeSelectTriggerRef = useRef<HTMLButtonElement>(null);
  
  const { initializeCart, clearCart } = useCartActions();
  const cart = useCartStore((state) => state.cart);

  const tentRef = useMemoFirebase(() => (firestore && tentId) ? doc(firestore, 'tents', tentId) : null, [firestore, tentId]);
  const { data: tent, isLoading: loadingTent } = useDoc<Tent>(tentRef);
  
  
  const subQueryTentId = tent?.id;
  
  const menuItemsQuery = useMemoFirebase(() => (firestore && subQueryTentId) ? collection(firestore, 'tents', subQueryTentId, 'menuItems') : null, [firestore, subQueryTentId]);
  const { data: menuItems, isLoading: loadingMenu } = useCollection<MenuItem>(menuItemsQuery);
  
  const rentalItemsQuery = useMemoFirebase(() => (firestore && subQueryTentId) ? collection(firestore, 'tents', subQueryTentId, 'rentalItems') : null, [firestore, subQueryTentId]);
  const { data: rentalItems, isLoading: loadingRentals } = useCollection<RentalItem>(rentalItemsQuery);
  
  const reviewsQuery = useMemoFirebase(() => (firestore && subQueryTentId) ? query(collection(firestore, 'tents', subQueryTentId, 'reviews'), orderBy('createdAt', 'desc')) : null, [firestore, subQueryTentId]);
  const { data: reviews, isLoading: loadingReviews } = useCollection<Review>(reviewsQuery);
  
  const userReservationsQuery = useMemoFirebase(() => {
    if (firestore && user && !user.isAnonymous && user.uid) {
        return query(collection(firestore, 'reservations'), where('participantIds', 'array-contains', user.uid));
    }
    return null;
  }, [firestore, user]);
  
  const { data: userReservations, isLoading: loadingActiveReservation } = useCollection<Reservation>(userReservationsQuery);

  const isOwnerViewingOwnTent = useMemo(() => {
    return user && tent ? user.uid === tent.ownerId : false;
  }, [user, tent]);
  
  const hasActiveReservation = useMemo(() => {
    if (!userReservations) return false;
    return userReservations.some(r => ['confirmed', 'checked-in', 'payment-pending'].includes(r.status));
  }, [userReservations]);
  
  const rentalKit = useMemo(() => rentalItems?.find(item => item.name === "Kit Guarda-sol + 2 Cadeiras"), [rentalItems]);
  const additionalChair = useMemo(() => rentalItems?.find(item => item.name === "Cadeira Adicional"), [rentalItems]);
  
  const isFavorite = useMemo(() => user?.favoriteTentIds?.includes(tentId), [user, tentId]);

  const [isTentOpenToday, setIsTentOpenToday] = useState(true);

  const timeSlots = useMemo(() => {
    if (!reservationDate || !tent?.operatingHours) return [];
    
    const dayKey = dayOrder[getDay(reservationDate)];
    const dayHours = tent.operatingHours[dayKey];
    if (!dayHours || !dayHours.isOpen) return [];

    const [openHour, openMinute] = dayHours.open.split(':').map(Number);
    const [closeHour, closeMinute] = dayHours.close.split(':').map(Number);
    const now = new Date();
    const isToday = format(reservationDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
    
    const slots = [];
    for (let h = openHour; h <= closeHour; h++) {
        for (let m = 0; m < 60; m += 30) {
            if (h === closeHour && m > closeMinute) continue;
            if (h === openHour && m < openMinute) continue;
            
            const slotDate = set(reservationDate, { hours: h, minutes: m });
            if (isToday && slotDate <= now) continue;
            
            slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        }
    }
    return slots;
  }, [reservationDate, tent?.operatingHours]);

  useEffect(() => {
    if (rentalItems) {
      initializeCart(rentalKit, isOwnerViewingOwnTent);
    }
    // Clear cart on component unmount
    return () => {
      clearCart();
    };
  }, [rentalItems, isOwnerViewingOwnTent, initializeCart, clearCart, rentalKit]);

  useEffect(() => {
      if (reservationDate) {
        const dayKey = dayOrder[getDay(reservationDate)];
        const dayHours = tent?.operatingHours?.[dayKey];
        setIsTentOpenToday(dayHours?.isOpen ?? true);
        setReservationTime(''); // Reset time when date changes
      } else {
        setIsTentOpenToday(true);
      }
  }, [reservationDate, tent?.operatingHours]);

  const validateReservationTime = useCallback(() => {
    if (!reservationDate || !reservationTime) {
      toast({
        variant: "destructive",
        title: "Data e Hora Obrigatórias",
        description: "Por favor, selecione uma data e um horário para a sua reserva.",
      });
      return false;
    }
    
    const now = new Date();
    const [selectedHour, selectedMinute] = reservationTime.split(':').map(Number);
    const reservationDateTime = new Date(reservationDate);
    reservationDateTime.setHours(selectedHour, selectedMinute, 0, 0);

    if (reservationDateTime <= now) {
        toast({
            variant: "destructive",
            title: "Horário Inválido",
            description: "Só é possível fazer reservas para horários futuros.",
        });
        return false;
    }
    return true;
  }, [reservationDate, reservationTime, toast]);

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

  const bannerSrc = tent.bannerUrl || tentBannerUrl;
  const hasRentalKitInCart = rentalKit && cart[rentalKit.id] && cart[rentalKit.id].quantity > 0;
  
  const handleProceedToMenu = () => {
    if (!hasRentalKitInCart) {
        toast({
            variant: "destructive",
            title: "Aluguel Obrigatório",
            description: "Você precisa alugar pelo menos um 'Kit Guarda-sol + 2 Cadeiras' para fazer uma reserva.",
        });
        return;
    }
    
    if (!validateReservationTime()) return;

    setActiveTab('menu');
  }

  const handleCreateReservation = async () => {
    if (!user || user.isAnonymous) {
        toast({
            variant: "destructive",
            title: "Login Necessário",
            description: "Você precisa estar logado para fazer um pedido.",
        });
        router.push(`/login?redirect=/tents/${tentId}`);
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
    
    if (!validateReservationTime()) return;
    
    const dayKey = dayOrder[getDay(reservationDate!)];
    if (tent.operatingHours) {
        const todayHours = tent.operatingHours[dayKey as keyof typeof tent.operatingHours] as OperatingHoursDay;
        if (todayHours && todayHours.isOpen) {
            const [openHour, openMinute] = todayHours.open.split(':').map(Number);
            const [closeHour, closeMinute] = todayHours.close.split(':').map(Number);
            const [selectedHour, selectedMinute] = reservationTime.split(':').map(Number);

            const selectedTimeInMinutes = selectedHour * 60 + selectedMinute;
            const openTimeInMinutes = openHour * 60 + openMinute;
            const closeTimeInMinutes = closeHour * 60 + closeMinute;

            if (selectedTimeInMinutes < openTimeInMinutes || selectedTimeInMinutes > closeTimeInMinutes) {
                toast({
                    variant: "destructive",
                    title: "Fora do Horário de Funcionamento",
                    description: `A barraca só aceita reservas entre ${todayHours.open} e ${todayHours.close}.`,
                });
                return;
            }
        } else if (todayHours && !todayHours.isOpen) {
             toast({
                variant: "destructive",
                title: "Barraca Fechada",
                description: `A barraca está fechada neste dia.`,
            });
            return;
        }
    }

    if (!firestore) return;
    setIsSubmitting(true);

    try {
        const batch = writeBatch(firestore);
        
        const newReservationRef = doc(collection(firestore, 'reservations'));
        const newChatRef = doc(collection(firestore, 'chats'));
        const userRef = doc(firestore, 'users', user.uid);
        const outstandingBalance = user.outstandingBalance || 0;

        const rentalTotal = Object.values(cart).filter(i => i.type === 'rental').reduce((acc, { item, quantity }) => acc + item.price * quantity, 0);
        const menuTotal = Object.values(cart).filter(i => i.type === 'menu').reduce((acc, { item, quantity }) => acc + item.price * quantity, 0);
        const kitsInCart = cart[rentalKit!.id]?.quantity || 0;
        const baseFeeWaiverAmount = tent.minimumOrderForFeeWaiver || 0;
        const proportionalFeeWaiverAmount = baseFeeWaiverAmount * kitsInCart;
        const isFeeWaived = proportionalFeeWaiverAmount > 0 && rentalTotal > 0 && menuTotal >= proportionalFeeWaiverAmount;
        const cartTotal = isFeeWaived ? menuTotal : menuTotal + rentalTotal;
        const finalTotal = cartTotal + outstandingBalance;

        const [selectedHour, selectedMinute] = reservationTime.split(':').map(Number);
        const finalReservationDateTime = new Date(reservationDate!);
        finalReservationDateTime.setHours(selectedHour, selectedMinute, 0, 0);

        const reservationData: ReservationWrite = {
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
                quantity: quantity
            })),
            total: finalTotal,
            outstandingBalancePaid: outstandingBalance,
            createdAt: finalReservationDateTime,
            creationTimestamp: serverTimestamp(),
            reservationTime,
            orderNumber: Math.random().toString(36).substr(2, 6).toUpperCase(),
            checkinCode: Math.floor(1000 + Math.random() * 9000).toString(),
            status: 'confirmed',
            participantIds: [user.uid, tent.ownerId],
        };

        const chatData: ChatWrite = {
            reservationId: newReservationRef.id,
            userId: user.uid,
            userName: user.displayName,
            userPhotoURL: user.photoURL || null,
            tentId: tent.id,
            tentName: tent.name,
            tentOwnerId: tent.ownerId,
            tentLogoUrl: tent.logoUrl || null,
            participantIds: [user.uid, tent.ownerId],
            status: 'active',
            lastMessage: 'Reserva criada. Inicie a conversa!',
            lastMessageSenderId: 'system',
            lastMessageTimestamp: serverTimestamp(),
        };
        
        batch.set(newReservationRef, reservationData);
        batch.set(newChatRef, chatData);
        
        if (outstandingBalance > 0) {
            batch.update(userRef, { outstandingBalance: 0 });
        }

        await batch.commit();
        
        toast({
            title: "Reserva Confirmada!",
            description: `Sua reserva na ${tent.name} foi criada com sucesso.`,
        });
        clearCart();
        await refresh();
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
  
  const handleToggleFavorite = async () => {
    if (!user || user.isAnonymous || !firestore) {
        toast({
            variant: "destructive",
            title: "Login Necessário",
            description: "Você precisa estar logado para favoritar uma barraca.",
        });
        router.push(`/login?redirect=/tents/${tentId}`);
        return;
    }
    setIsFavoriting(true);
    const userRef = doc(firestore, 'users', user.uid);
    try {
        await updateDoc(userRef, {
            favoriteTentIds: isFavorite ? arrayRemove(tentId) : arrayUnion(tentId)
        });
        await refresh();
        toast({
            title: isFavorite ? "Removido dos Favoritos" : "Adicionado aos Favoritos!",
        });
    } catch (error) {
        console.error("Error toggling favorite:", error);
        toast({ variant: 'destructive', title: 'Ocorreu um erro' });
    } finally {
        setIsFavoriting(false);
    }
};

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <div className="relative h-64 w-full md:h-96">
            <Image
                src={bannerSrc}
                alt={tent.name}
                className="object-cover"
                data-ai-hint="ocean"
                fill
                priority
            />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 p-8 text-white">
            <div className="flex items-end gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold drop-shadow-lg md:text-6xl">{tent.name}</h1>
                    <p className="mt-2 max-w-2xl text-lg drop-shadow-md">{tent.description}</p>
                    {tent.reviewCount != null && tent.reviewCount > 0 && (
                        <div className="flex items-center gap-2 mt-4">
                            <div className="flex items-center">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className={cn("w-5 h-5", i < Math.round(tent.averageRating || 0) ? "text-yellow-400 fill-yellow-400" : "text-yellow-400/50")} />
                                ))}
                            </div>
                            <span className="text-white font-bold">{tent.averageRating.toFixed(1)}</span>
                            <span className="text-sm text-white/80">({tent.reviewCount} avaliações)</span>
                        </div>
                    )}
                </div>
                <Button 
                    variant="outline" 
                    size="icon" 
                    className="bg-transparent text-white border-white hover:bg-white/10 hover:text-white rounded-full shrink-0" 
                    onClick={handleToggleFavorite} 
                    disabled={isFavoriting || isOwnerViewingOwnTent || user?.isAnonymous}
                    aria-label="Favoritar"
                >
                    <Heart className={cn("transition-colors", isFavorite && "fill-red-500 text-red-500")} />
                </Button>
            </div>
          </div>
        </div>

        <div className="container mx-auto max-w-7xl px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-8">
            <div className="lg:col-span-2">
                 <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
                        <TabsTrigger value="reserve">Aluguel e Horário</TabsTrigger>
                        <TabsTrigger value="menu">Cardápio</TabsTrigger>
                        <TabsTrigger value="reviews">Avaliações</TabsTrigger>
                        <TabsTrigger value="info">Informações</TabsTrigger>
                    </TabsList>
                    <div className="mt-6">
                        <TabsContent value="reserve" className="mt-0 space-y-6">
                            <div>
                                <h2 className="text-2xl font-semibold leading-none tracking-tight">Aluguel de Itens e Horário</h2>
                                <p className="text-sm text-muted-foreground mt-1.5">Para reservar, é obrigatório o aluguel do kit e a seleção de data e hora. { user?.isAnonymous && <Link href={`/login?redirect=/tents/${tentId}`} className="text-primary underline font-medium">Faça login para alugar</Link>}</p>
                            </div>
                            
                            <div className="space-y-6">
                                  {!isTentOpenToday && reservationDate && (
                                    <Alert variant="destructive">
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertTitle>Barraca Fechada</AlertTitle>
                                        <AlertDescription>
                                            Esta barraca está fechada no dia selecionado. Por favor, escolha outra data.
                                        </AlertDescription>
                                    </Alert>
                                  )}
                                  <div className={cn(!isTentOpenToday && 'opacity-50 pointer-events-none')}>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                          <div className="space-y-2">
                                            <Label className="flex items-center gap-2"><CalendarIcon className="w-4 h-4"/> Data da Reserva</Label>
                                            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn(
                                                            "w-full justify-start text-left font-normal",
                                                            !reservationDate && "text-muted-foreground"
                                                        )}
                                                        disabled={isSubmitting}
                                                    >
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {reservationDate ? format(reservationDate, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0">
                                                    <Calendar
                                                        mode="single"
                                                        selected={reservationDate}
                                                        onSelect={(date) => {
                                                            setReservationDate(date);
                                                            setIsCalendarOpen(false);
                                                            setTimeout(() => timeSelectTriggerRef.current?.focus(), 100);
                                                        }}
                                                        initialFocus
                                                        locale={ptBR}
                                                        fromDate={new Date()}
                                                        toDate={addDays(new Date(), 3)}
                                                        disabled={isSubmitting}
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                          </div>
                                          <div className="space-y-2">
                                              <Label htmlFor="reservation-time" className="flex items-center gap-2"><Clock className="w-4 h-4"/> Horário da Reserva</Label>
                                              <Select onValueChange={setReservationTime} value={reservationTime} disabled={isSubmitting || !reservationDate || timeSlots.length === 0}>
                                                  <SelectTrigger id="reservation-time" ref={timeSelectTriggerRef}>
                                                      <SelectValue placeholder="Selecione um horário" />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                      {timeSlots.map(time => (
                                                          <SelectItem key={time} value={time}>{time}</SelectItem>
                                                      ))}
                                                  </SelectContent>
                                              </Select>
                                              {!reservationDate && <p className="text-xs text-muted-foreground">Selecione uma data para ver os horários.</p>}
                                              {reservationDate && timeSlots.length === 0 && <p className="text-xs text-destructive">Não há horários disponíveis para esta data.</p>}
                                          </div>
                                      </div>
                                  </div>
                                  
                                    {loadingRentals ? <Loader2 className="mx-auto my-8 h-8 w-8 animate-spin text-primary" /> : (
                                      <RentalList rentalKit={rentalKit} additionalChair={additionalChair} isSubmitting={isSubmitting} />
                                    )}
                            </div>
                        </TabsContent>

                        <TabsContent value="menu" className="mt-0">
                            <div>
                                <h2 className="text-2xl font-semibold leading-none tracking-tight">Nosso Cardápio</h2>
                                <p className="text-sm text-muted-foreground mt-1.5">Escolha seus pratos e bebidas favoritos.</p>
                                {tent.minimumOrderForFeeWaiver && tent.minimumOrderForFeeWaiver > 0 && (
                                    <div className="mt-4 flex items-center gap-3 rounded-lg bg-primary/10 p-3 text-sm text-primary-foreground">
                                        <Info className="h-5 w-5 text-primary"/>
                                        <div>
                                          <span className="font-semibold">Aluguel grátis!</span> Peça a partir de <span className="font-bold">R$ {(tent.minimumOrderForFeeWaiver * (cart[rentalKit?.id as string]?.quantity || 0)).toFixed(2)}</span> em consumo e ganhe a isenção da taxa de aluguel.
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <MenuList menuItems={menuItems} isLoading={loadingMenu} isSubmitting={isSubmitting} />
                        </TabsContent>

                        <TabsContent value="reviews" className="mt-0">
                             <div>
                                <h2 className="text-2xl font-semibold leading-none tracking-tight">Avaliações dos Clientes</h2>
                                <p className="text-sm text-muted-foreground mt-1.5">{tent.reviewCount != null && tent.reviewCount > 0 ? `Veja o que outros clientes estão a dizer sobre a ${tent.name}.` : 'Esta barraca ainda não tem avaliações.'}</p>
                            </div>
                            
                            <div className="space-y-6 mt-6">
                                {loadingReviews ? (
                                    <Loader2 className="mx-auto my-8 h-8 w-8 animate-spin text-primary" />
                                ) : reviews && reviews.length > 0 ? (
                                    reviews.map(review => (
                                        <div key={review.id} className="flex gap-4">
                                            <Avatar>
                                                <AvatarImage src={review.userPhotoURL ?? undefined} />
                                                <AvatarFallback className="bg-primary/20 text-primary">
                                                    <UserIcon className="h-5 w-5" />
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <p className="font-semibold">{review.userName}</p>
                                                    <div className="flex items-center">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star key={i} className={cn("w-4 h-4", i < review.rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/50")} />
                                                        ))}
                                                    </div>
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-2">{review.comment}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center text-muted-foreground py-8">Seja o primeiro a avaliar!</p>
                                )}
                            </div>
                        </TabsContent>

                         <TabsContent value="info" className="mt-0">
                            <h2 className="text-2xl font-semibold leading-none tracking-tight">Informações</h2>
                            <div className="mt-6">
                                <h3 className="font-semibold flex items-center gap-2"><Clock className="w-4 h-4" /> Horário de Funcionamento</h3>
                                <OperatingHoursDisplay hours={tent.operatingHours} />
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
            <div className="lg:col-span-1 mt-8 lg:mt-0">
                <CartSummary
                  tent={tent}
                  isOwnerViewingOwnTent={isOwnerViewingOwnTent}
                  hasActiveReservation={hasActiveReservation}
                  isSubmitting={isSubmitting || !reservationDate || !reservationTime}
                  activeTab={activeTab}
                  handleProceedToMenu={handleProceedToMenu}
                  handleCreateReservation={handleCreateReservation}
                />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
