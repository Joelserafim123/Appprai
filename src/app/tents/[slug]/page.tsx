

'use client';

import { notFound, useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Armchair, Minus, Plus, ShoppingCart, Umbrella, Info, Loader2, MessageSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useMemo, useState, useEffect } from 'react';
import { useUser } from '@/firebase/provider';
import { useFirebase } from '@/firebase/provider';
import { addDoc, collection, query, where, getDocs, serverTimestamp, setDoc, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Link from 'next/link';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { Tent } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { TentMedia, MenuItem, RentalItem } from '@/lib/types';
import { useMemoFirebase } from '@/firebase/provider';


type CartItem = { 
    item: MenuItem | RentalItem; 
    quantity: number,
    type: 'menu' | 'rental' 
};


export default function TentPage({ params }: { params: { slug: string } }) {
  const { firestore } = useFirebase();
  const router = useRouter();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [tent, setTent] = useState<Tent | null>(null);
  const [loadingTent, setLoadingTent] = useState(true);

  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tentQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'tents'), where('slug', '==', params.slug));
  }, [firestore, params.slug]);

  useEffect(() => {
    const fetchTent = async () => {
      if (!tentQuery) return;
      try {
        const querySnapshot = await getDocs(tentQuery);
        if (querySnapshot.empty) {
          notFound();
        } else {
          const tentData = querySnapshot.docs[0].data() as Tent;
          setTent({ ...tentData, id: querySnapshot.docs[0].id });
        }
      } catch (error) {
        console.error("Error fetching tent:", error);
        notFound();
      } finally {
        setLoadingTent(false);
      }
    };
    fetchTent();
  }, [tentQuery]);


  const menuQuery = useMemoFirebase(() => {
    if (!tent || !firestore) return null;
    return collection(firestore, 'tents', tent.id, 'menuItems');
  }, [tent, firestore]);

  const rentalsQuery = useMemoFirebase(() => {
    if (!tent || !firestore) return null;
    return collection(firestore, 'tents', tent.id, 'rentalItems');
  }, [tent, firestore]);
  
  const mediaQuery = useMemoFirebase(() => {
    if (!tent || !firestore) return null;
    return collection(firestore, 'tents', tent.id, 'media');
  }, [tent, firestore]);

  const { data: menuItems, isLoading: loadingMenu } = useCollection<MenuItem>(menuQuery);
  const { data: rentalItems, isLoading: loadingRentals } = useCollection<RentalItem>(rentalsQuery);
  const { data: tentMedia, isLoading: loadingMedia } = useCollection<TentMedia>(mediaQuery);
  
  const rentalKit = useMemo(() => rentalItems?.find(item => item.name === "Kit Guarda-sol + 2 Cadeiras"), [rentalItems]);
  const additionalChair = useMemo(() => rentalItems?.find(item => item.name === "Cadeira Adicional"), [rentalItems]);


  const handleStartChat = async () => {
    if (!user || !firestore || !tent) {
        toast({ variant: 'destructive', title: 'Você precisa estar logado para iniciar uma conversa.' });
        router.push(`/login?redirect=/tents/${params.slug}`);
        return;
    }

    const chatId = `${user.uid}_${tent.id}`;
    const chatDocRef = doc(firestore, 'chats', chatId);

    try {
        await setDoc(chatDocRef, {
            userId: user.uid,
            userName: user.displayName,
            userPhotoURL: user.photoURL || '',
            tentId: tent.id,
            tentOwnerId: tent.ownerId,
            tentName: tent.name,
            tentLogoUrl: tentMedia?.[0]?.mediaUrl || '',
            lastMessage: 'Conversa iniciada!',
            lastMessageTimestamp: serverTimestamp()
        }, { merge: true });

        router.push(`/dashboard/chats?chatId=${chatId}`);

    } catch (e: any) {
         console.error("Error starting chat:", e);
         const permissionError = new FirestorePermissionError({
            path: `chats/${chatId}`,
            operation: 'write',
            requestResourceData: { userId: user.uid, tentId: tent.id }
        });
        errorEmitter.emit('permission-error', permissionError);
    }
  };


  if (loadingTent || !tent) {
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
      }

      if (newQuantity === 0) {
        const { [item.id]: _, ...rest } = prev;
        
        // If removing the kit, also remove additional chairs
        if (item.id === rentalKit?.id) {
           const { [additionalChair!.id]: __, ...finalRest } = rest;
           return finalRest;
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

  const feeWaiverAmount = tent.minimumOrderForFeeWaiver || 0;
  const isFeeWaived = feeWaiverAmount > 0 && rentalTotal > 0 && menuTotal >= feeWaiverAmount;
  
  const finalTotal = isFeeWaived ? menuTotal : menuTotal + rentalTotal;
  
  const hasRentalKitInCart = rentalKit && cart[rentalKit.id] && cart[rentalKit.id].quantity > 0;
  const isCartEmpty = Object.keys(cart).length === 0;

  const handleCreateReservation = async () => {
    if (!user || !firestore || !hasRentalKitInCart) {
      if(!user) {
        toast({
          variant: "destructive",
          title: "Login Necessário",
          description: "Você precisa estar logado para fazer um pedido.",
        });
        router.push(`/login?redirect=/tents/${tent.slug}`);
      } else if (!hasRentalKitInCart) {
         toast({
          variant: "destructive",
          title: "Aluguel Obrigatório",
          description: "Você precisa alugar um 'Kit Guarda-sol + 2 Cadeiras' para fazer uma reserva.",
        });
      }
      return;
    };
    
    setIsSubmitting(true);

    const reservationData = {
      userId: user.uid,
      userName: user.displayName,
      tentId: tent.id,
      tentName: tent.name,
      tentOwnerName: tent.ownerName,
      items: Object.values(cart).map(({ item, quantity }) => ({
        itemId: item.id,
        name: item.name,
        price: item.price,
        quantity: quantity,
      })),
      total: finalTotal,
      createdAt: serverTimestamp(),
      status: 'confirmed',
    };

    const reservationsColRef = collection(firestore, 'reservations');
    addDoc(reservationsColRef, reservationData).then(() => {
        toast({
            title: "Reserva Confirmada!",
            description: `Sua reserva na ${tent.name} foi criada com sucesso.`,
        });
        router.push('/dashboard/my-reservations');
    }).catch(error => {
        const permissionError = new FirestorePermissionError({
            path: reservationsColRef.path,
            operation: 'create',
            requestResourceData: reservationData,
        });
        errorEmitter.emit('permission-error', permissionError);
    }).finally(() => {
        setIsSubmitting(false);
    });
  };


  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <div className="relative h-64 w-full md:h-96">
         {loadingMedia ? <div className="flex h-full w-full items-center justify-center bg-muted"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : tentMedia && tentMedia.length > 0 ? (
            tentMedia[0].type === 'video' ? (
                <video
                    src={tentMedia[0].mediaUrl}
                    className="object-cover h-full w-full"
                    autoPlay
                    loop
                    muted
                    playsInline
                />
            ) : (
                 <Image
                    src={tentMedia[0].mediaUrl}
                    alt={tent.name}
                    data-ai-hint={tentMedia[0].mediaHint}
                    className="object-cover"
                    fill
                    priority
                />
            )
         ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">Nenhuma imagem</div>
         )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 p-8 text-white">
            <h1 className="text-4xl font-extrabold drop-shadow-lg md:text-6xl">{tent.name}</h1>
            <p className="mt-2 max-w-2xl text-lg drop-shadow-md">{tent.description}</p>
          </div>
        </div>

        <div className="container mx-auto max-w-7xl px-4 py-8">
            <div className="mb-6 flex justify-end">
                <Button onClick={handleStartChat} variant="outline">
                    <MessageSquare className="mr-2 h-4 w-4"/>
                    Iniciar Conversa
                </Button>
            </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-8">
            <div className="lg:col-span-2">
                 <Tabs defaultValue="reserve" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 md:w-[400px]">
                        <TabsTrigger value="reserve">Aluguel</TabsTrigger>
                        <TabsTrigger value="menu">Cardápio</TabsTrigger>
                        <TabsTrigger value="gallery">Galeria</TabsTrigger>
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
                                    <span className="font-semibold">Aluguel grátis!</span> Peça a partir de <span className="font-bold">R$ {tent.minimumOrderForFeeWaiver.toFixed(2)}</span> em consumo e ganhe a isenção da taxa de aluguel.
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
                                    <CardTitle>Aluguel de Itens</CardTitle>
                                    <CardDescription>Para reservar, é obrigatório o aluguel do "Kit Guarda-sol + 2 Cadeiras". { !user && <Link href={`/login?redirect=/tents/${tent.slug}`} className="text-primary underline font-medium">Faça login para alugar</Link>}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                {loadingRentals ? <Loader2 className="mx-auto my-8 h-8 w-8 animate-spin text-primary" /> : rentalItems && rentalItems.length > 0 ? (
                                    <>
                                        {rentalKit && (
                                            <div className="flex flex-col rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                                                <div>
                                                    <h3 className="flex items-center gap-2 text-lg font-semibold">
                                                        <Umbrella className="h-5 w-5"/> + <Armchair className="h-5 w-5"/>
                                                        {rentalKit.name}
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground">Disponível: {rentalKit.quantity - (cart[rentalKit.id]?.quantity || 0)}</p>
                                                    <p className="text-2xl font-bold text-primary">R$ {rentalKit.price.toFixed(2)}</p>
                                                </div>
                                                <div className="mt-4 flex items-center gap-2 sm:mt-0">
                                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange(rentalKit, 'rental', -1)} disabled={isSubmitting}><Minus className="h-4 w-4"/></Button>
                                                    <Input type="number" readOnly value={cart[rentalKit.id]?.quantity || 0} className="h-8 w-16 text-center" disabled={isSubmitting}/>
                                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange(rentalKit, 'rental', 1)} disabled={isSubmitting || (cart[rentalKit.id]?.quantity || 0) >= rentalKit.quantity}><Plus className="h-4 w-4"/></Button>
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
                                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange(additionalChair, 'rental', 1)} disabled={isSubmitting || !hasRentalKitInCart || (cart[additionalChair.id]?.quantity || 0) >= additionalChair.quantity}><Plus className="h-4 w-4"/></Button>
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

                        <TabsContent value="gallery" className="mt-6">
                        <Card>
                                <CardHeader>
                                    <CardTitle>Galeria de Fotos</CardTitle>
                                    <CardDescription>Um pouco do nosso paraíso.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                {loadingMedia ? <Loader2 className="mx-auto my-8 h-8 w-8 animate-spin text-primary" /> : tentMedia && tentMedia.length > 0 ? (
                                    <Carousel className="w-full">
                                        <CarouselContent>
                                            {tentMedia.map((media, index) => (
                                            <CarouselItem key={index}>
                                                <div className="p-1">
                                                <Card>
                                                    <CardContent className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg p-0">
                                                        {media.type === 'video' ? (
                                                            <video src={media.mediaUrl} controls className="h-full w-full object-cover" />
                                                        ) : (
                                                            <Image src={media.mediaUrl} alt={media.description || tent.name} fill data-ai-hint={media.mediaHint} className="object-cover"/>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                                </div>
                                            </CarouselItem>
                                            ))}
                                        </CarouselContent>
                                        <CarouselPrevious />
                                        <CarouselNext />
                                    </Carousel>
                                ) : (
                                    <p className="text-muted-foreground text-center py-8">Nenhum item na galeria.</p>
                                )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
            </div>
            <div className="lg:col-span-1">
                <Card className="sticky top-24">
                    <CardHeader>
                        <CardTitle>Sua Reserva Inicial</CardTitle>
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
                        <Button size="lg" className="w-full" onClick={handleCreateReservation} disabled={!hasRentalKitInCart || isSubmitting}>
                           {isSubmitting ? <Loader2 className="animate-spin" /> : 'Fazer Reserva Inicial'}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
