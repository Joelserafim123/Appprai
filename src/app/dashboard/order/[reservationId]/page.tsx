
'use client';

import { useParams, useRouter, notFound } from 'next/navigation';
import { useUser } from '@/firebase/provider';
import { useFirebase } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useCollection } from '@/firebase/firestore/use-collection';
import { doc, collection, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { Loader2, Minus, Plus, Info, Utensils, Scan } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Reservation, MenuItem, ReservationItem } from '@/lib/types';
import { useMemoFirebase } from '@/firebase/provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cn } from '@/lib/utils';


type OrderCartItem = { 
    item: MenuItem; 
    quantity: number,
};

export default function OrderPage() {
    const { reservationId } = useParams();
    const { user } = useUser();
    const { firestore } = useFirebase();
    const router = useRouter();
    const { toast } = useToast();

    const [cart, setCart] = useState<Record<string, OrderCartItem>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const reservationRef = useMemoFirebase(() => {
        if (!firestore || !reservationId) return null;
        return doc(firestore, 'reservations', reservationId as string);
    }, [firestore, reservationId]);

    const { data: reservation, isLoading: loadingReservation, error: reservationError } = useDoc<Reservation>(reservationRef);
    
    const menuQuery = useMemoFirebase(() => {
        if (!reservation || !firestore) return null;
        return collection(firestore, 'tents', reservation.tentId, 'menuItems');
    }, [reservation, firestore]);

    const { data: menuItems, isLoading: loadingMenu } = useCollection<MenuItem>(menuQuery);
    
    if (loadingReservation || loadingMenu) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Carregando pedido...</p>
            </div>
        );
    }
    
    if (!reservation || reservationError) {
        notFound();
    }
    
    if (user && reservation.userId !== user.uid) {
        return <p>Você não tem permissão para ver este pedido.</p>
    }
    
    if (reservation.status !== 'checked-in') {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center gap-4 text-center">
                 <Utensils className="h-12 w-12 text-muted-foreground" />
                <h1 className="text-2xl font-bold">Não é possível adicionar itens</h1>
                <p className="text-muted-foreground max-w-sm">Você só pode adicionar itens a um pedido após o dono da barraca ter feito seu check-in. O status atual do seu pedido é: <span className="font-semibold">{reservation.status}</span>.</p>
                 <Button onClick={() => router.back()}>Voltar</Button>
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

    const handleQuantityChange = (item: MenuItem, change: number) => {
        setCart((prev) => {
        const existing = prev[item.id] || { item, quantity: 0 };
        let newQuantity = Math.max(0, existing.quantity + change);
        
        if (newQuantity === 0) {
            const { [item.id]: _, ...rest } = prev;
            return rest;
        }

        return {
            ...prev,
            [item.id]: { ...existing, quantity: newQuantity },
        };
        });
    };

    const newItemsTotal = Object.values(cart).reduce((acc, { item, quantity }) => acc + item.price * quantity, 0);
    const isCartEmpty = Object.keys(cart).length === 0;

    const handleAddItemsToReservation = async () => {
        if (!firestore || isCartEmpty || !reservationRef) return;
        setIsSubmitting(true);
    
        const newItems: ReservationItem[] = Object.values(cart).map(({ item, quantity }) => ({
            itemId: item.id,
            name: item.name,
            price: item.price,
            quantity: quantity,
            status: 'pending',
        }));
    
        const updateData = {
            items: arrayUnion(...newItems)
        };

        updateDoc(reservationRef, updateData).then(() => {
            toast({
                title: "Pedido Enviado!",
                description: `Sua solicitação foi enviada para a barraca. Aguarde a confirmação.`,
            });
            router.push('/dashboard/my-reservations');
        }).catch(error => {
            const permissionError = new FirestorePermissionError({
                path: reservationRef.path,
                operation: 'update',
                requestResourceData: { items: newItems },
            });
            errorEmitter.emit('permission-error', permissionError);
            throw error;
        }).finally(() => {
            setIsSubmitting(false);
        });
    };


    return (
        <div className="w-full max-w-5xl">
            <div className="mb-6">
                <h1 className="text-3xl font-bold">Adicionar Itens ao Pedido</h1>
                <div className="text-muted-foreground flex items-center gap-4">
                    <p>Pedido para a barraca: <span className="font-semibold">{reservation.tentName}</span></p>
                    {reservation.tableNumber && (
                        <p className="font-semibold flex items-center gap-2"><Scan className="w-4 h-4"/> Mesa {reservation.tableNumber}</p>
                    )}
                </div>
            </div>
             <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-8">
                <div className="lg:col-span-2">
                     <Card>
                        <CardHeader>
                            <CardTitle>Cardápio</CardTitle>
                            <CardDescription>Selecione os itens para adicionar ao seu pedido. Eles serão confirmados pelo barraqueiro.</CardDescription>
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
                                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange(item, -1)} disabled={isSubmitting}><Minus className="h-4 w-4"/></Button>
                                            <Input type="number" readOnly value={cart[item.id]?.quantity || 0} className="h-8 w-12 text-center" disabled={isSubmitting}/>
                                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange(item, 1)} disabled={isSubmitting}><Plus className="h-4 w-4"/></Button>
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
                </div>
                 <div className="lg:col-span-1 mt-8 lg:mt-0">
                    <Card className="sticky top-24">
                        <CardHeader>
                            <CardTitle>Novos Itens</CardTitle>
                            <CardDescription>Itens a serem adicionados.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {isCartEmpty ? (
                                <p className="text-center text-muted-foreground">Seu carrinho está vazio.</p>
                            ) : (
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                {Object.values(cart).map(({ item, quantity }) => (
                                    <li key={item.id} className="flex justify-between">
                                        <span>{quantity}x {item.name}</span>
                                        <span>R$ {(item.price * quantity).toFixed(2)}</span>
                                    </li>
                                ))}
                            </ul>
                            )}
                        </CardContent>
                        <CardFooter className="flex-col items-stretch gap-4">
                            <div className="flex justify-between items-baseline border-t pt-4">
                                <p className="text-sm text-muted-foreground">Subtotal (pendente)</p>
                                <p className="text-2xl font-bold">R$ {newItemsTotal.toFixed(2)}</p>
                            </div>
                            <Button size="lg" className="w-full" onClick={handleAddItemsToReservation} disabled={isCartEmpty || isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin" /> : 'Enviar Pedido para Confirmação'}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
             </div>
        </div>
    );
}
