'use client';

import { useUser, useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Star, Calendar, Hash, Check, X, CreditCard, History, Search, Eye, AlertCircle, UserX, Info, AlertTriangle, HandCoins, QrCode, User as UserIcon, Utensils } from 'lucide-react';
import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { Reservation, ReservationStatus, PaymentMethod, Tent } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { collection, query, where, doc, updateDoc, addDoc, getDocs, serverTimestamp, writeBatch, increment, limit, orderBy, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useTranslations } from '@/i18n';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';


const statusConfig: Record<ReservationStatus, { text: string; variant: "default" | "secondary" | "destructive" }> = {
  'confirmed': { text: 'Confirmada', variant: 'default' },
  'checked-in': { text: 'Check-in Feito', variant: 'default' },
  'payment-pending': { text: 'Pagamento Pendente', variant: 'destructive' },
  'completed': { text: 'Completa', variant: 'secondary' },
  'cancelled': { text: 'Cancelada', variant: 'destructive' }
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
    card: 'Cartão',
    cash: 'Dinheiro',
    pix: 'PIX'
}

function getReservationDateTime(reservation: Reservation): Date {
    const reservationDate = reservation.createdAt.toDate();
    const [hours, minutes] = reservation.reservationTime.split(':').map(Number);
    return new Date(reservationDate.getFullYear(), reservationDate.getMonth(), reservationDate.getDate(), hours, minutes);
}

function CheckInDialog({ reservation, onFinished }: { reservation: Reservation; onFinished: (id: string) => void }) {
    const { toast } = useToast();
    const { firestore } = useFirebase();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [inputCode, setInputCode] = useState('');
    const [tableNumber, setTableNumber] = useState('');
    
    const handleConfirmCheckIn = async () => {
        if (inputCode !== reservation.checkinCode) {
            toast({ variant: 'destructive', title: 'Código de Check-in Inválido' });
            return;
        }
        if (!tableNumber) {
            toast({ variant: 'destructive', title: 'Número da Mesa Obrigatório' });
            return;
        }
        if (!firestore) return;
        setIsSubmitting(true);
        try {
            await updateDoc(doc(firestore, 'reservations', reservation.id), { 
                status: 'checked-in',
                tableNumber: parseInt(tableNumber, 10),
            });
            toast({ title: 'Check-in realizado com sucesso!' });
            onFinished(reservation.id);
        } catch(error) {
            console.error("Error during check-in: ", error);
            toast({ variant: 'destructive', title: 'Erro ao fazer check-in' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Confirmar Check-in</DialogTitle>
                 <DialogDescription>
                    Peça ao cliente o código de 4 dígitos e informe o número da mesa.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <p>Confirmando a chegada de <span className='font-bold'>{reservation.userName}</span> (Pedido Nº {reservation.orderNumber})?</p>
                 <div className="space-y-2">
                    <Label htmlFor="checkin-code">Código de Check-in (4 dígitos)</Label>
                    <Input
                        id="checkin-code"
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        maxLength={4}
                        className="text-center text-lg tracking-[0.5em]"
                        placeholder="••••"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="table-number">Número da Mesa</Label>
                    <Input
                        id="table-number"
                        type="number"
                        value={tableNumber}
                        onChange={(e) => setTableNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="Ex: 15"
                    />
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="ghost" disabled={isSubmitting}>Cancelar</Button></DialogClose>
                <Button onClick={handleConfirmCheckIn} disabled={isSubmitting || inputCode.length !== 4 || !tableNumber}>
                    {isSubmitting ? <Loader2 className="animate-spin" /> : 'Sim, Fazer Check-in'}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}

function PaymentDialog({ reservation, onFinished }: { reservation: Reservation; onFinished: () => void }) {
    const { toast } = useToast();
    const { firestore } = useFirebase();
    const { user } = useUser();
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleConfirmPayment = async () => {
        if (!paymentMethod) {
            toast({ variant: 'destructive', title: 'Selecione um método de pagamento.'});
            return;
        };
        if (!firestore || !user) return;
        setIsSubmitting(true);

        const reservationRef = doc(firestore, 'reservations', reservation.id);
        const platformFee = Math.max(reservation.total * 0.10, 3);
        const reservationUpdateData = {
            status: 'completed' as const,
            paymentMethod: paymentMethod,
            platformFee: platformFee,
            completedAt: serverTimestamp(),
        };

        try {
            const batch = writeBatch(firestore);
            
            batch.update(reservationRef, reservationUpdateData);

            const chatsRef = collection(firestore, 'chats');
            const q = query(chatsRef, where('reservationId', '==', reservation.id), where('participantIds', 'array-contains', user.uid), limit(1));
            const chatSnapshot = await getDocs(q);
            if (!chatSnapshot.empty) {
                const chatDoc = chatSnapshot.docs[0];
                batch.update(chatDoc.ref, { status: 'archived' });
            }
            
            await batch.commit();

            toast({ title: 'Pagamento Confirmado!' });
            onFinished();
        } catch(error) {
            console.error("Error confirming payment: ", error);
            const permissionError = new FirestorePermissionError({
              path: `reservations/${reservation.id}`,
              operation: 'update',
              requestResourceData: reservationUpdateData,
            });
            errorEmitter.emit('permission-error', permissionError);
            toast({ variant: 'destructive', title: 'Erro ao confirmar pagamento' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Confirmar Pagamento</DialogTitle>
                <DialogDescription>
                    Confirme o recebimento do valor de <span className="font-bold">R$ {reservation.total.toFixed(2)}</span> e selecione o método de pagamento utilizado pelo cliente.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <RadioGroup onValueChange={(value) => setPaymentMethod(value as PaymentMethod)} value={paymentMethod ?? undefined} className="grid grid-cols-3 gap-4">
                    <div>
                        <RadioGroupItem value="card" id="owner-card" className="peer sr-only" />
                        <Label htmlFor="owner-card" className="flex h-full flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary">
                            <CreditCard className="mb-3 h-6 w-6" />
                            Cartão
                        </Label>
                    </div>
                     <div>
                        <RadioGroupItem value="pix" id="owner-pix" className="peer sr-only" />
                         <Label htmlFor="owner-pix" className="flex h-full flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary">
                            <QrCode className="mb-3 h-6 w-6" />
                            PIX
                        </Label>
                    </div>
                    <div>
                        <RadioGroupItem value="cash" id="owner-cash" className="peer sr-only" />
                        <Label htmlFor="owner-cash" className="flex h-full flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary">
                            <HandCoins className="mb-3 h-6 w-6" />
                            Dinheiro
                        </Label>
                    </div>
                </RadioGroup>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="ghost">Cancelar</Button></DialogClose>
                <Button onClick={handleConfirmPayment} disabled={!paymentMethod || isSubmitting}>
                     {isSubmitting ? <Loader2 className="animate-spin" /> : 'Confirmar'}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}

const ReservationCard = ({ reservation }: { reservation: Reservation }) => {
    const { user } = useUser();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const router = useRouter();
    const t_products = useTranslations('Shared.ProductNames');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [reservationForPayment, setReservationForPayment] = useState<Reservation | null>(null);
    const [reservationForCheckIn, setReservationForCheckIn] = useState<Reservation | null>(null);
    const [reservationForCancel, setReservationForCancel] = useState<Reservation | null>(null);
    const [reservationForNoShow, setReservationForNoShow] = useState<Reservation | null>(null);
    const [canMarkNoShow, setCanMarkNoShow] = useState(false);
    const [isProcessingPending, setIsProcessingPending] = useState(false);

    const pendingItems = useMemo(() => reservation.items.filter(i => i.status === 'pending_confirmation'), [reservation.items]);

    const handleAcceptPendingItems = async () => {
        if (!firestore || !user || pendingItems.length === 0) return;
        setIsProcessingPending(true);
        
        const reservationRef = doc(firestore, 'reservations', reservation.id);
        const newItems = reservation.items.map(item => 
            item.status === 'pending_confirmation' ? { ...item, status: 'pending' as const } : item
        );

        // Fetch tent data to recalculate total
        const tentRef = doc(firestore, 'tents', reservation.tentId);
        
        try {
            const tentSnap = await getDoc(tentRef);
            if (!tentSnap.exists()) {
                toast({ variant: 'destructive', title: 'Erro: Barraca não encontrada.' });
                setIsProcessingPending(false);
                return;
            }
            const tentData = tentSnap.data() as Tent;

            // Recalculate total
            const rentalItems = newItems.filter(item => item.name === 'Kit Guarda-sol + 2 Cadeiras' || item.name === 'Cadeira Adicional');
            const menuItems = newItems.filter(item => !(item.name === 'Kit Guarda-sol + 2 Cadeiras' || item.name === 'Cadeira Adicional'));
            const rentalTotal = rentalItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
            const menuTotal = menuItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
            
            const kitsInCart = rentalItems.find(i => i.name === 'Kit Guarda-sol + 2 Cadeiras')?.quantity || 0;
            const baseFeeWaiverAmount = tentData.minimumOrderForFeeWaiver || 0;
            const proportionalFeeWaiverAmount = baseFeeWaiverAmount * kitsInCart;
            const isFeeWaived = proportionalFeeWaiverAmount > 0 && rentalTotal > 0 && menuTotal >= proportionalFeeWaiverAmount;

            const cartTotal = isFeeWaived ? menuTotal : menuTotal + rentalTotal;
            const newTotal = cartTotal + (reservation.outstandingBalancePaid || 0);

            const batch = writeBatch(firestore);
            
            batch.update(reservationRef, { items: newItems, total: newTotal });

            const chatsRef = collection(firestore, 'chats');
            const q = query(chatsRef, where('reservationId', '==', reservation.id), where('participantIds', 'array-contains', user.uid), limit(1));
            const chatSnapshot = await getDocs(q);

            if (!chatSnapshot.empty) {
                const chatDocRef = chatSnapshot.docs[0].ref;
                const messagesCollectionRef = collection(chatDocRef, 'messages');
                const newMessageRef = doc(messagesCollectionRef);
                const notificationMessage = {
                    senderId: 'system',
                    text: 'Seu pedido de novos itens foi aceite pela barraca!',
                    timestamp: serverTimestamp(),
                    isRead: false
                };
                batch.set(newMessageRef, notificationMessage);
                batch.update(chatDocRef, {
                    lastMessage: notificationMessage.text,
                    lastMessageSenderId: 'system',
                    lastMessageTimestamp: serverTimestamp(),
                });
            }
            
            await batch.commit();
            toast({ title: 'Itens aceites com sucesso!' });

        } catch (error) {
            const permissionError = new FirestorePermissionError({
                path: reservationRef.path,
                operation: 'update',
                requestResourceData: { items: newItems },
            });
            errorEmitter.emit('permission-error', permissionError);
            toast({ variant: 'destructive', title: 'Erro ao aceitar itens' });
        } finally {
            setIsProcessingPending(false);
        }
    };

    const handleRejectPendingItems = async () => {
        if (!firestore || !user || pendingItems.length === 0) return;
        setIsProcessingPending(true);

        const reservationRef = doc(firestore, 'reservations', reservation.id);
        const newItems = reservation.items.filter(item => item.status !== 'pending_confirmation');
        
        try {
            const batch = writeBatch(firestore);
            batch.update(reservationRef, { items: newItems });

            const chatsRef = collection(firestore, 'chats');
            const q = query(chatsRef, where('reservationId', '==', reservation.id), where('participantIds', 'array-contains', user.uid), limit(1));
            const chatSnapshot = await getDocs(q);

            if (!chatSnapshot.empty) {
                const chatDocRef = chatSnapshot.docs[0].ref;
                const messagesCollectionRef = collection(chatDocRef, 'messages');
                const newMessageRef = doc(messagesCollectionRef);
                const itemNames = pendingItems.map(i => i.name).join(', ');
                const notificationMessage = {
                    senderId: 'system',
                    text: `Lamentamos, mas não foi possível adicionar os seguintes itens ao seu pedido: ${itemNames}.`,
                    timestamp: serverTimestamp(),
                    isRead: false
                };
                batch.set(newMessageRef, notificationMessage);
                batch.update(chatDocRef, {
                    lastMessage: 'Alguns itens do seu pedido foram recusados.',
                    lastMessageSenderId: 'system',
                    lastMessageTimestamp: serverTimestamp(),
                });
            }
            
            await batch.commit();
            toast({ title: 'Itens recusados.' });

        } catch (error) {
            const permissionError = new FirestorePermissionError({
                path: reservationRef.path,
                operation: 'update',
                requestResourceData: { items: newItems },
            });
            errorEmitter.emit('permission-error', permissionError);
            toast({ variant: 'destructive', title: 'Erro ao recusar itens' });
        } finally {
            setIsProcessingPending(false);
        }
    };


    useEffect(() => {
        if (reservation.status !== 'confirmed') {
            setCanMarkNoShow(false);
            return;
        }

        const reservationDateTime = getReservationDateTime(reservation);
        const checkTime = () => {
            const now = new Date();
            const fifteenMinutesAfter = new Date(reservationDateTime.getTime() + 15 * 60 * 1000);
            setCanMarkNoShow(now > fifteenMinutesAfter);
        };

        checkTime();
        const interval = setInterval(checkTime, 60000); // Check every minute
        return () => clearInterval(interval);
    }, [reservation]);

    const isLateCancellation = useMemo(() => {
        if (!reservationForCancel) return false;
        const now = new Date();
        const reservationDateTime = getReservationDateTime(reservationForCancel);
        return reservationDateTime.getTime() - now.getTime() < 15 * 60 * 1000;
    }, [reservationForCancel]);


    const handleCancelReservation = async () => {
        if (!firestore || !reservationForCancel || !user) return;
        setIsSubmitting(true);
        
        try {
            const batch = writeBatch(firestore);
            const reservationRef = doc(firestore, 'reservations', reservationForCancel.id);
            const updateData: { status: ReservationStatus, platformFee?: number, cancellationReason?: string } = { status: 'cancelled' };
            let feeApplied = false;

            if (isLateCancellation || reservationForCancel?.status === 'checked-in') {
                updateData.platformFee = 3.00;
                updateData.cancellationReason = 'owner_late';
                feeApplied = true;
            }
            batch.update(reservationRef, updateData);
            
            const chatsRef = collection(firestore, 'chats');
            const q = query(chatsRef, where('reservationId', '==', reservationForCancel.id), where('participantIds', 'array-contains', user.uid), limit(1));
            const chatSnapshot = await getDocs(q);
            if (!chatSnapshot.empty) {
                batch.update(chatSnapshot.docs[0].ref, { status: 'archived' });
            }

            await batch.commit();

            toast({
                title: "Reserva Cancelada!",
                description: feeApplied ? "Uma taxa de R$ 3,00 foi aplicada a você por este cancelamento." : undefined,
                variant: feeApplied ? 'destructive' : 'default',
            });
        } catch (error) {
            console.error("Error cancelling reservation: ", error);
            const permissionError = new FirestorePermissionError({
              path: `reservations/${reservationForCancel.id}`,
              operation: 'update',
              requestResourceData: updateData,
            });
            errorEmitter.emit('permission-error', permissionError);
            toast({ variant: 'destructive', title: 'Erro ao cancelar reserva' });
        } finally {
            setIsSubmitting(false);
            setReservationForCancel(null);
        }
    };
    
    const handleNoShow = async () => {
        if (!firestore || !reservationForNoShow || !user) return;
        setIsSubmitting(true);

        try {
            const batch = writeBatch(firestore);
            const reservationRef = doc(firestore, 'reservations', reservationForNoShow.id);
            const clientUserRef = doc(firestore, 'users', reservationForNoShow.userId);

            batch.update(reservationRef, {
                status: 'cancelled',
                cancellationFee: 3,
                cancellationReason: 'no_show'
            });

            batch.update(clientUserRef, {
                outstandingBalance: increment(3)
            });

            const chatsRef = collection(firestore, 'chats');
            const q = query(chatsRef, where('reservationId', '==', reservationForNoShow.id), where('participantIds', 'array-contains', user.uid), limit(1));
            const chatSnapshot = await getDocs(q);
            if (!chatSnapshot.empty) {
                batch.update(chatSnapshot.docs[0].ref, { status: 'archived' });
            }
            
            await batch.commit();
            toast({ title: 'Reserva cancelada por não comparecimento.', description: 'Uma taxa de R$ 3,00 foi aplicada ao cliente.' });
        } catch (error) {
            console.error("Error marking no-show: ", error);
            const permissionError = new FirestorePermissionError({
              path: `reservations/${reservationForNoShow.id}`,
              operation: 'update',
              requestResourceData: { status: 'cancelled', cancellationReason: 'no_show'},
            });
            errorEmitter.emit('permission-error', permissionError);
            toast({ variant: 'destructive', title: 'Erro ao marcar não comparecimento' });
        } finally {
            setIsSubmitting(false);
            setReservationForNoShow(null);
        }
    }


    const handleCloseBill = async (reservationId: string) => {
        if (!firestore) return;
        try {
            await updateDoc(doc(firestore, 'reservations', reservationId), { status: 'payment-pending' });
            toast({ title: "Conta fechada!", description: "Aguardando confirmação de pagamento do cliente."});
        } catch(error) {
            console.error("Error closing bill: ", error);
            toast({ variant: 'destructive', title: 'Erro ao fechar a conta' });
        }
    }

    const handleStartChat = (reservation: Reservation) => {
        router.push(`/dashboard/chats?reservationId=${reservation.id}`);
    };

    return (
        <>
            <Card className="flex flex-col transition-all hover:shadow-md">
                <CardHeader>
                    <div className='flex flex-col gap-4 sm:flex-row justify-between items-start'>
                        <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={undefined} alt={reservation.userName} />
                                <AvatarFallback><UserIcon className="h-5 w-5" /></AvatarFallback>
                            </Avatar>
                            <div className="grid gap-0.5">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <UserIcon className="h-5 w-5" />
                                    {reservation.userName}
                                </CardTitle>
                                <CardDescription>Pedido: {reservation.orderNumber}</CardDescription>
                            </div>
                        </div>
                        <Badge variant={statusConfig[reservation.status].variant}>
                            {statusConfig[reservation.status].text}
                        </Badge>
                    </div>
                    <div className='text-sm text-muted-foreground space-y-1 pt-2'>
                        <p className='flex items-center gap-2'><Calendar className='w-4 h-4'/>
                        {reservation.createdAt.toDate().toLocaleDateString('pt-BR', {
                        day: '2-digit', month: 'long', year: 'numeric',
                        })} às {reservation.reservationTime}
                        </p>
                        {reservation.tableNumber && (
                            <p className='flex items-center gap-2 font-semibold text-foreground'><Hash className='w-4 h-4'/> Mesa {reservation.tableNumber}</p>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="flex-1">
                    {['checked-in', 'payment-pending', 'completed'].includes(reservation.status) ? (
                        <>
                            <h4 className="flex items-center gap-2 text-sm font-semibold mb-2"><History className="w-4 h-4"/> Itens do Pedido</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                {reservation.items.filter(i => i.status !== 'pending_confirmation').map((item, index) => {
                                  const isRental = item.name === 'Kit Guarda-sol + 2 Cadeiras' || item.name === 'Cadeira Adicional';
                                  return (
                                    <li key={index} className="flex justify-between">
                                        <span>{item.quantity}x {isRental ? t_products(item.name as any) : item.name}</span>
                                        <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
                                    </li>
                                  )
                                })}
                            </ul>
                            <div className="mt-4 pt-4 border-t text-right">
                                <p className="text-sm font-medium text-muted-foreground">Total</p>
                                <p className='font-bold text-lg'>R$ {reservation.total.toFixed(2)}</p>
                            </div>
                        </>
                    ) : (
                        <div className="text-center text-muted-foreground bg-muted p-4 rounded-md my-4">
                            <Info className="mx-auto h-6 w-6 mb-2" />
                            <p className="text-sm font-semibold">Detalhes do pedido ocultos</p>
                            <p className="text-xs">Os itens e o valor total serão exibidos após o check-in do cliente.</p>
                        </div>
                    )}
                </CardContent>
                {pendingItems.length > 0 && (
                    <div className="bg-amber-50 border-amber-200 border-t p-4 space-y-3">
                        <h4 className="font-semibold text-amber-800 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Novos Itens Pendentes</h4>
                        <ul className="space-y-1 text-sm text-amber-900 list-disc list-inside">
                            {pendingItems.map((item, index) => (
                                <li key={index}>
                                    {item.quantity}x {item.name}
                                </li>
                            ))}
                        </ul>
                        <div className="flex gap-2">
                            <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleAcceptPendingItems} disabled={isProcessingPending}>
                                {isProcessingPending ? <Loader2 className="animate-spin" /> : 'Aceitar'}
                            </Button>
                            <Button size="sm" variant="destructive" className="flex-1" onClick={handleRejectPendingItems} disabled={isProcessingPending}>
                                {isProcessingPending ? <Loader2 className="animate-spin" /> : 'Recusar'}
                            </Button>
                        </div>
                    </div>
                )}
                <CardFooter className="flex-col gap-2">
                        {reservation.status === 'confirmed' && (
                        <div className="grid grid-cols-1 gap-2 w-full">
                            <Button size="sm" onClick={() => setReservationForCheckIn(reservation)}>
                                <Check className="mr-2 h-4 w-4" /> Fazer Check-in
                            </Button>
                             <div className="grid grid-cols-2 gap-2 w-full">
                                <Button size="sm" variant="destructive" onClick={() => setReservationForCancel(reservation)}>
                                    <X className="mr-2 h-4 w-4" /> Cancelar
                                </Button>
                                <Button size="sm" variant="secondary" onClick={() => setReservationForNoShow(reservation)} disabled={!canMarkNoShow}>
                                    <UserX className="mr-2 h-4 w-4" /> Não Compareceu
                                </Button>
                             </div>
                        </div>
                    )}
                    {reservation.status === 'checked-in' && (
                        <div className="flex w-full flex-col gap-2">
                            <Button asChild size="sm">
                                <Link href={`/dashboard/owner-order/${reservation.id}`}>
                                    <Utensils className="mr-2 h-4 w-4" /> Gerenciar Pedido
                                </Link>
                            </Button>
                            <div className="grid grid-cols-2 gap-2 w-full">
                                <Button size="sm" variant="secondary" onClick={() => handleCloseBill(reservation.id)} className="w-full">
                                    <CreditCard className="mr-2 h-4 w-4" /> Fechar Conta
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => setReservationForCancel(reservation)}>
                                    <X className="mr-2 h-4 w-4" /> Cancelar
                                </Button>
                            </div>
                        </div>
                    )}
                    {reservation.status === 'payment-pending' && (
                        <div className="w-full">
                            <Button size="sm" className="w-full" onClick={() => setReservationForPayment(reservation)}>
                                <CreditCard className="mr-2 h-4 w-4" /> Confirmar Pagamento
                            </Button>
                        </div>
                    )}
                    {['confirmed', 'checked-in'].includes(reservation.status) && reservation.status !== 'cancelled' && (
                        <Button size="sm" variant="outline" className="w-full" onClick={() => handleStartChat(reservation)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Conversa
                        </Button>
                    )}
                        {reservation.status === 'completed' && reservation.paymentMethod && (
                        <div className="text-sm text-center w-full bg-green-50 text-green-700 p-2 rounded-md font-semibold">
                            Pago com {paymentMethodLabels[reservation.paymentMethod]}
                        </div>
                    )}
                </CardFooter>
            </Card>

            {/* Dialogs */}
            <Dialog open={!!reservationForPayment} onOpenChange={(open) => !open && setReservationForPayment(null)}>
                {reservationForPayment && <PaymentDialog reservation={reservationForPayment} onFinished={() => setReservationForPayment(null)} />}
            </Dialog>
            <Dialog open={!!reservationForCheckIn} onOpenChange={(open) => !open && setReservationForCheckIn(null)}>
                {reservationForCheckIn && <CheckInDialog reservation={reservationForCheckIn} onFinished={() => setReservationForCheckIn(null)} />}
            </Dialog>
            <AlertDialog open={!!reservationForCancel} onOpenChange={(open) => !open && setReservationForCancel(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {isLateCancellation || reservationForCancel?.status === 'checked-in'
                            ? "Esta ação não pode ser desfeita e irá cancelar a reserva do cliente. Uma taxa será aplicada."
                            : "Esta ação não pode ser desfeita e irá cancelar a reserva do cliente."
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-4 pt-2">
                        {(isLateCancellation || reservationForCancel?.status === 'checked-in') && (
                            <div className="p-3 rounded-md bg-destructive/10 text-destructive-foreground flex items-center gap-3">
                                <AlertCircle className="h-5 w-5 text-destructive" />
                                <div>
                                    <div className="font-bold">Será aplicada uma taxa de R$ 3,00.</div>
                                    <div className="text-xs">Você está a cancelar perto do horário da reserva ou após o check-in. Esta taxa será somada ao seu repasse para a plataforma.</div>
                                </div>
                            </div>
                        )}
                        <div className="p-3 rounded-md bg-muted/50 border flex items-center gap-3">
                            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <div className="font-bold text-foreground">Aviso sobre a Política de Uso</div>
                                <div className="text-xs text-muted-foreground">Cancelamentos frequentes podem impactar negativamente a sua reputação e, em casos extremos, levar à suspensão da sua conta.</div>
                            </div>
                        </div>
                    </div>
                    <AlertDialogFooter>
                    <AlertDialogCancel disabled={isSubmitting}>Voltar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancelReservation} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin"/> : "Sim, cancelar"}
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={!!reservationForNoShow} onOpenChange={(open) => !open && setReservationForNoShow(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Não Comparecimento?</AlertDialogTitle>
                        <AlertDialogDescription>
                           Isto irá cancelar a reserva de <span className="font-semibold">{reservationForNoShow?.userName}</span>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                     <div className="space-y-4">
                        <div className="p-3 rounded-md bg-destructive/10 text-destructive-foreground flex items-center gap-3">
                            <AlertCircle className="h-5 w-5 text-destructive" />
                            <div>
                                <div className="font-bold">Uma taxa de R$ 3,00 será aplicada ao cliente.</div>
                                <div className="text-xs">A taxa será cobrada do cliente na próxima reserva que ele fizer na plataforma.</div>
                            </div>
                        </div>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSubmitting}>Voltar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleNoShow} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin"/> : "Confirmar e Cancelar"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};


export default function OwnerReservationsPage() {
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // A loud, repeating beep sound. Using a public domain sound.
    const beepSoundUrl = 'https://cdn.freesound.org/previews/15/15234_35939-lq.mp3';
    audioRef.current = new Audio(beepSoundUrl);
    audioRef.current.loop = true;
    audioRef.current.volume = 1.0;

    // Cleanup function to pause audio when component unmounts
    return () => {
        audioRef.current?.pause();
    };
  }, []);
  
  const reservationsQuery = useMemoFirebase(
    () => (user?.role === 'owner' && firestore) ? query(
        collection(firestore, 'reservations'),
        where('participantIds', 'array-contains', user.uid)
      ) : null,
    [firestore, user]
  );
  const { data: rawReservations, isLoading: reservationsLoading } = useCollection<Reservation>(reservationsQuery);
  
  const reservations = useMemo(() => {
    if (!rawReservations || !user) return [];
    // Sort on the client-side for robustness against inconsistent data
    return rawReservations
        .filter(r => r.tentOwnerId === user.uid)
        .sort((a, b) => {
            const timeA = a.creationTimestamp?.toMillis() || a.createdAt.toMillis();
            const timeB = b.creationTimestamp?.toMillis() || b.createdAt.toMillis();
            return timeB - timeA;
        });
  }, [rawReservations, user]);

  const hasPendingConfirmationItems = useMemo(() => {
    if (!reservations) return false;
    // Check if any reservation has at least one item with 'pending_confirmation' status
    return reservations.some(res => 
        res.items.some(item => item.status === 'pending_confirmation')
    );
  }, [reservations]);


  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
        if (hasPendingConfirmationItems) {
            if (audio.paused) {
                audio.play().catch(error => {
                    console.warn("A reprodução automática do som falhou. O utilizador poderá ter de interagir com a página primeiro.", error);
                    toast({
                        title: "Novo Pedido Pendente!",
                        description: "Você tem um novo pedido para confirmar.",
                        duration: 10000,
                    });
                });
            }
        } else {
            if (!audio.paused) {
                audio.pause();
                audio.currentTime = 0;
            }
        }
    }
  }, [hasPendingConfirmationItems, toast]);

  const filteredReservations = useMemo(() => {
    if (!reservations) return [];
    
    if (searchTerm) {
        return reservations.filter(res => 
            res.orderNumber?.includes(searchTerm) ||
            res.userName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    return reservations;
  }, [reservations, searchTerm]);

  if (isUserLoading || (reservationsLoading && !rawReservations)) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== 'owner') {
    return <p>Acesso negado. Esta página é apenas para donos de barracas.</p>;
  }

  return (
    <div className="w-full max-w-6xl">
    <header className="mb-8 space-y-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Reservas da Barraca</h1>
            <p className="text-muted-foreground">Gerencie todas as reservas para sua barraca.</p>
        </div>
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder="Buscar por Nº do Pedido ou nome do cliente..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
    </header>

    {filteredReservations && filteredReservations.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredReservations.map((reservation) => (
            <ReservationCard key={reservation.id} reservation={reservation} />
        ))}
        </div>
    ) : (
        <div className="rounded-lg border-2 border-dashed py-16 text-center">
            <Star className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">Nenhuma reserva encontrada</h3>
            <p className="mt-2 text-sm text-muted-foreground">
                {searchTerm ? 'Nenhuma reserva corresponde à sua busca.' : 'Sua barraca ainda não recebeu nenhuma reserva.'}
            </p>
        </div>
    )}
    </div>
  );
}
