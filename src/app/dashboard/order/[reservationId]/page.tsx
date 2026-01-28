'use client';

import { useParams, useRouter, notFound } from 'next/navigation';
import { useUser, useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useCollection } from '@/firebase/firestore/use-collection';
import { Button } from '@/components/ui/button';
import { Loader2, Utensils, ShoppingCart } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { MenuList } from '@/components/tents/menu-list';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { useCartStore } from '@/hooks/use-cart-store';
import { doc, collection, writeBatch, arrayUnion, increment, serverTimestamp, getDocs, query, where, limit } from 'firebase/firestore';
import type { Reservation, MenuItem, ChatMessageWrite, Tent } from '@/lib/types';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

export default function OrderPage() {
    const router = useRouter();
    const params = useParams();
    const { user, isUserLoading } = useUser();
    const { firestore } = useFirebase();
    const reservationId = params.reservationId as string;
    const { toast } = useToast();

    const [isSubmitting, setIsSubmitting] = useState(false);

    const { cart, clearCart } = useCartStore();

    const reservationRef = useMemoFirebase(() => (firestore && reservationId) ? doc(firestore, 'reservations', reservationId) : null, [firestore, reservationId]);
    const { data: reservation, isLoading: isLoadingReservation } = useDoc<Reservation>(reservationRef);
    
    const tentRef = useMemoFirebase(() => (firestore && reservation) ? doc(firestore, 'tents', reservation.tentId) : null, [firestore, reservation]);
    const { data: tent, isLoading: isLoadingTent } = useDoc<Tent>(tentRef);

    const menuItemsQuery = useMemoFirebase(() => (firestore && tent) ? collection(firestore, 'tents', tent.id, 'menuItems') : null, [firestore, tent]);
    const { data: menuItems, isLoading: isLoadingMenu } = useCollection<MenuItem>(menuItemsQuery);

    useEffect(() => {
        // Clear cart on component mount and unmount
        clearCart();
        return () => clearCart();
    }, [clearCart]);

    const handleAddItems = async () => {
        if (!firestore || !reservation || !user) return;
        
        const newItems = Object.values(cart).filter(ci => ci.type === 'menu');
        if (newItems.length === 0) {
            toast({ variant: 'destructive', title: 'Nenhum item selecionado' });
            return;
        }

        setIsSubmitting(true);
        const newItemsTotal = newItems.reduce((acc, { item, quantity }) => acc + (item.price * quantity), 0);

        try {
            const batch = writeBatch(firestore);
            
            // 1. Update reservation with new items and total
            batch.update(reservationRef!, {
                items: arrayUnion(...newItems.map(ni => ({
                    itemId: ni.item.id,
                    name: ni.item.name,
                    price: ni.item.price,
                    quantity: ni.quantity,
                    status: 'pending' as const
                }))),
                total: increment(newItemsTotal)
            });

            // 2. Find chat and add a system message
            const chatsRef = collection(firestore, 'chats');
            const q = query(chatsRef, where('reservationId', '==', reservation.id), where('participantIds', 'array-contains', user.uid), limit(1));
            const chatSnapshot = await getDocs(q);

            if (!chatSnapshot.empty) {
                const chatDocRef = chatSnapshot.docs[0].ref;
                const messagesCollectionRef = collection(chatDocRef, 'messages');
                const newMessageRef = doc(messagesCollectionRef); // Create a ref for the new message

                const notificationMessage: ChatMessageWrite = {
                    senderId: 'system',
                    text: 'O cliente adicionou novos itens ao pedido. Por favor, verifique a cozinha.',
                    timestamp: serverTimestamp(),
                    isRead: false
                };
                
                batch.set(newMessageRef, notificationMessage);

                // 3. Update the chat's last message
                batch.update(chatDocRef, {
                    lastMessage: notificationMessage.text,
                    lastMessageSenderId: 'system',
                    lastMessageTimestamp: serverTimestamp(),
                });
            }


            await batch.commit();

            toast({ title: 'Itens adicionados com sucesso!' });
            clearCart();
            router.push('/dashboard/my-reservations');

        } catch (error) {
            console.error("Error adding items to reservation: ", error);
            const permissionError = new FirestorePermissionError({
                path: reservationRef!.path,
                operation: 'update',
                requestResourceData: { 
                    items: `Adding ${newItems.length} items.`, 
                    total: `Incrementing by ${newItemsTotal}` 
                }
            });
            errorEmitter.emit('permission-error', permissionError);
            toast({ variant: 'destructive', title: 'Erro ao adicionar itens' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (isLoadingReservation || isUserLoading || isLoadingTent || isLoadingMenu) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p>A carregar pedido...</p>
            </div>
        );
    }
    
    if (!reservation) {
        notFound();
    }
    
    if (reservation.status !== 'checked-in') {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center gap-4 text-center">
                <Utensils className="h-12 w-12 text-muted-foreground" />
                <h1 className="text-2xl font-bold">Não é possível adicionar itens</h1>
                <p className="text-muted-foreground max-w-sm">Só pode adicionar novos itens a um pedido após o check-in e antes de a conta ser fechada.</p>
                <Button onClick={() => router.back()}>Voltar</Button>
            </div>
        );
    }
    
    const newItemsTotal = Object.values(cart).reduce((acc, { item, quantity }) => acc + (item.price * quantity), 0);

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <main className="container mx-auto max-w-4xl px-4 py-8">
                <div className="mb-8">
                    <Button variant="ghost" onClick={() => router.back()} className="mb-4">
                        &larr; Voltar para Minhas Reservas
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight">Adicionar Itens ao Pedido</h1>
                    <p className="text-muted-foreground">Adicione mais itens ao seu pedido na barraca <span className="font-semibold text-primary">{reservation.tentName}</span>.</p>
                </div>
                
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <MenuList menuItems={menuItems} isLoading={isLoadingMenu} isSubmitting={isSubmitting} />
                    </div>
                    <div className="lg:col-span-1">
                        <Card className="sticky top-24">
                            <CardHeader>
                                <CardTitle>Novos Itens</CardTitle>
                                <CardDescription>Itens a serem adicionados ao seu pedido.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {Object.keys(cart).length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center">Nenhum item adicionado.</p>
                                ) : (
                                    <ul className="space-y-2 text-sm">
                                        {Object.values(cart).map(({ item, quantity }) => (
                                            <li key={item.id} className="flex justify-between">
                                                <span>{quantity}x {item.name}</span>
                                                <span>R$ {(item.price * quantity).toFixed(2)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </CardContent>
                            <CardFooter className="flex-col items-stretch gap-2">
                                <div className="flex justify-between items-baseline">
                                    <p className="text-sm">Total dos Novos Itens</p>
                                    <p className="font-bold text-lg">R$ {newItemsTotal.toFixed(2)}</p>
                                </div>
                                <Button onClick={handleAddItems} disabled={isSubmitting || Object.keys(cart).length === 0}>
                                    {isSubmitting ? <Loader2 className="animate-spin" /> : <>Adicionar ao Pedido <ShoppingCart className="ml-2"/></>}
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
