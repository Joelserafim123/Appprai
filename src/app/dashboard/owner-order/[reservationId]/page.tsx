'use client';

import { useParams, useRouter, notFound } from 'next/navigation';
import { useUser, useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useCollection } from '@/firebase/firestore/use-collection';
import { Button } from '@/components/ui/button';
import { Loader2, Utensils, ArrowLeft, Plus, Minus } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { doc, collection, writeBatch, serverTimestamp, getDocs, query, where, limit } from 'firebase/firestore';
import type { Reservation, MenuItem, Tent, ReservationItem } from '@/lib/types';
import { useEffect, useState, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { useTranslations } from '@/i18n';
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

// This is a new component for the menu, as the existing one is tied to useCartStore
const OwnerMenuList = ({ menuItems, onAddItem, isSubmitting }: { menuItems: MenuItem[], onAddItem: (item: MenuItem) => void, isSubmitting: boolean }) => {
    const t_categories = useTranslations('Shared.Categories');

    const menuByCategory = (menuItems || []).reduce((acc, item) => {
        const category = item.category || 'Outros';
        if (!acc[category]) {
        acc[category] = [];
        }
        acc[category].push(item);
        return acc;
    }, {} as Record<string, MenuItem[]>);

    return (
        <div className="space-y-4 mt-6">
        {Object.entries(menuByCategory).map(([category, items]) => (
            <div key={category}>
                <h3 className="text-lg font-semibold mb-2">{t_categories(category as any)}</h3>
                <div className="space-y-4 pt-2">
                    {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                        <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                        <p className="text-sm font-bold text-primary">R$ {item.price.toFixed(2)}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => onAddItem(item)} disabled={isSubmitting}>
                            <Plus className="mr-2 h-4 w-4"/> Adicionar
                        </Button>
                    </div>
                    ))}
                </div>
            </div>
        ))}
        </div>
    );
};


export default function OwnerOrderPage() {
    const router = useRouter();
    const params = useParams();
    const { user, isUserLoading } = useUser();
    const { firestore } = useFirebase();
    const reservationId = params.reservationId as string;
    const { toast } = useToast();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editedItems, setEditedItems] = useState<ReservationItem[]>([]);

    const reservationRef = useMemoFirebase(() => (firestore && reservationId) ? doc(firestore, 'reservations', reservationId) : null, [firestore, reservationId]);
    const { data: reservation, isLoading: isLoadingReservation } = useDoc<Reservation>(reservationRef);
    
    const tentRef = useMemoFirebase(() => (firestore && reservation) ? doc(firestore, 'tents', reservation.tentId) : null, [firestore, reservation]);
    const { data: tent, isLoading: isLoadingTent } = useDoc<Tent>(tentRef);

    const menuItemsQuery = useMemoFirebase(() => (firestore && tent) ? collection(firestore, 'tents', tent.id, 'menuItems') : null, [firestore, tent]);
    const { data: menuItems, isLoading: isLoadingMenu } = useCollection<MenuItem>(menuItemsQuery);

    useEffect(() => {
        if (reservation) {
            // Deep copy to avoid direct mutation
            setEditedItems(JSON.parse(JSON.stringify(reservation.items)));
        }
    }, [reservation]);

    const originalTotal = reservation?.total || 0;
    
    const newTotal = useMemo(() => {
        // Recalculate total based on edited items, preserving rental fees logic if possible
        if (!reservation || !tent) return 0;

        const rentalItemsFromOrder = editedItems.filter(item => {
            const isRental = item.name === 'Kit Guarda-sol + 2 Cadeiras' || item.name === 'Cadeira Adicional';
            return isRental;
        });
        const menuItemsFromOrder = editedItems.filter(item => {
            const isRental = item.name === 'Kit Guarda-sol + 2 Cadeiras' || item.name === 'Cadeira Adicional';
            return !isRental;
        });

        const rentalTotal = rentalItemsFromOrder.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        const menuTotal = menuItemsFromOrder.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        
        const kitsInCart = rentalItemsFromOrder.find(i => i.name === 'Kit Guarda-sol + 2 Cadeiras')?.quantity || 0;
        const baseFeeWaiverAmount = tent.minimumOrderForFeeWaiver || 0;
        const proportionalFeeWaiverAmount = baseFeeWaiverAmount * kitsInCart;

        const isFeeWaived = proportionalFeeWaiverAmount > 0 && rentalTotal > 0 && menuTotal >= proportionalFeeWaiverAmount;
        
        const cartTotal = isFeeWaived ? menuTotal : menuTotal + rentalTotal;

        return cartTotal + (reservation.outstandingBalancePaid || 0);

    }, [editedItems, tent, reservation]);

    const hasChanges = useMemo(() => {
        if (!reservation) return false;
        return newTotal.toFixed(2) !== originalTotal.toFixed(2) || JSON.stringify(editedItems) !== JSON.stringify(reservation.items);
    }, [newTotal, originalTotal, editedItems, reservation]);


    const handleItemQuantityChange = (itemId: string, change: number) => {
        setEditedItems(currentItems => {
            const newItems = [...currentItems];
            const itemIndex = newItems.findIndex(i => i.itemId === itemId);
            if (itemIndex > -1) {
                const newQuantity = newItems[itemIndex].quantity + change;
                if (newQuantity <= 0) {
                    newItems.splice(itemIndex, 1); // Remove if quantity is 0 or less
                } else {
                    newItems[itemIndex] = { ...newItems[itemIndex], quantity: newQuantity };
                }
            }
            return newItems;
        });
    };

    const handleAddItem = (menuItem: MenuItem) => {
        setEditedItems(currentItems => {
            const newItems = [...currentItems];
            const itemIndex = newItems.findIndex(i => i.itemId === menuItem.id);
            if (itemIndex > -1) {
                newItems[itemIndex] = { ...newItems[itemIndex], quantity: newItems[itemIndex].quantity + 1 };
            } else {
                newItems.push({
                    itemId: menuItem.id,
                    name: menuItem.name,
                    price: menuItem.price,
                    quantity: 1
                });
            }
            return newItems;
        });
    };

    const handleSaveChanges = async () => {
        if (!firestore || !reservation || !user || !hasChanges) return;
        
        setIsSubmitting(true);
        const totalDifference = newTotal - originalTotal;
        const changeDescription = totalDifference > 0 ? `Itens totalizando R$ ${totalDifference.toFixed(2)} foram adicionados.` : 'Itens foram removidos/alterados.';
        
        try {
            const batch = writeBatch(firestore);
            
            // 1. Update reservation with new items and total
            batch.update(reservationRef!, {
                items: editedItems,
                total: newTotal,
            });

            // 2. Find chat and add a system message
            const chatsRef = collection(firestore, 'chats');
            const q = query(chatsRef, where('reservationId', '==', reservation.id), limit(1));
            const chatSnapshot = await getDocs(q);

            if (!chatSnapshot.empty) {
                const chatDocRef = chatSnapshot.docs[0].ref;
                const messagesCollectionRef = collection(chatDocRef, 'messages');
                const newMessageRef = doc(messagesCollectionRef);

                const notificationMessage = {
                    senderId: 'system',
                    text: `O proprietário da barraca alterou o pedido. ${changeDescription}`,
                    timestamp: serverTimestamp(),
                    isRead: false
                };
                
                batch.set(newMessageRef, notificationMessage);

                batch.update(chatDocRef, {
                    lastMessage: "O pedido foi alterado pelo proprietário.",
                    lastMessageSenderId: 'system',
                    lastMessageTimestamp: serverTimestamp(),
                });
            }

            await batch.commit();

            toast({ title: 'Pedido atualizado com sucesso!' });
            router.push('/dashboard/reservations');

        } catch (error) {
            console.error("Error updating reservation items: ", error);
            toast({ variant: 'destructive', title: 'Erro ao atualizar pedido' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (isLoadingReservation || isUserLoading || isLoadingTent || isLoadingMenu) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p>A carregar gestão do pedido...</p>
            </div>
        );
    }
    
    if (!reservation || !user || reservation.tentOwnerId !== user.uid) {
        notFound();
    }
    
    if (reservation.status !== 'checked-in') {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center gap-4 text-center">
                <Utensils className="h-12 w-12 text-muted-foreground" />
                <h1 className="text-2xl font-bold">Não é possível editar o pedido</h1>
                <p className="text-muted-foreground max-w-sm">Só pode editar um pedido enquanto o cliente estiver com o estado 'Check-in Feito'.</p>
                <Button onClick={() => router.back()}>Voltar</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <main className="container mx-auto max-w-6xl px-4 py-8">
                <div className="mb-8">
                    <Button variant="ghost" onClick={() => router.push('/dashboard/reservations')} className="mb-4">
                        <ArrowLeft className="mr-2"/> Voltar para Reservas
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight">Gerenciar Pedido de {reservation.userName}</h1>
                    <p className="text-muted-foreground">Adicione ou remova itens do pedido Nº {reservation.orderNumber}.</p>
                </div>
                
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Itens Atuais no Pedido</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {editedItems.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum item no pedido.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {editedItems.map((item) => (
                                            <div key={item.itemId} className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium">{item.name}</p>
                                                    <p className="text-sm text-muted-foreground">R$ {item.price.toFixed(2)} cada</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleItemQuantityChange(item.itemId, -1)} disabled={isSubmitting}>
                                                        <Minus className="h-4 w-4" />
                                                    </Button>
                                                    <span className="w-8 text-center font-bold">{item.quantity}</span>
                                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleItemQuantityChange(item.itemId, 1)} disabled={isSubmitting}>
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Separator className="my-8" />
                        
                        <Card>
                            <CardHeader>
                                <CardTitle>Adicionar Novos Itens</CardTitle>
                                <CardDescription>Selecione itens do cardápio para adicionar ao pedido.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoadingMenu ? <Loader2 /> : <OwnerMenuList menuItems={menuItems!} onAddItem={handleAddItem} isSubmitting={isSubmitting} />}
                            </CardContent>
                        </Card>
                    </div>
                    <div className="lg:col-span-1">
                        <Card className="sticky top-24">
                            <CardHeader>
                                <CardTitle>Resumo do Pedido</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                               <div className="flex justify-between text-sm text-muted-foreground">
                                    <span>Total Original</span>
                                    <span>R$ {originalTotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-baseline font-bold">
                                    <span>Novo Total</span>
                                    <span className="text-2xl">R$ {newTotal.toFixed(2)}</span>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button className="w-full" disabled={isSubmitting || !hasChanges}>
                                            {isSubmitting ? <Loader2 className="animate-spin" /> : 'Salvar Alterações'}
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Confirmar Alterações?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Isto irá atualizar o pedido do cliente para o novo valor de R$ {newTotal.toFixed(2)}. O cliente será notificado da alteração. Deseja continuar?
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleSaveChanges}>Sim, Salvar</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
