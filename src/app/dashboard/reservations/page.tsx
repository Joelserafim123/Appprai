'use client';

import { useUser, useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Star, User as UserIcon, Calendar, Hash, Check, X, CreditCard, ChefHat, History, Search, MessageSquare } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { Reservation, ReservationStatus, PaymentMethod } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import { collection, query, where, doc, updateDoc, getDoc, addDoc, getDocs, serverTimestamp, orderBy } from 'firebase/firestore';
import { useRouter } from 'next/navigation';


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

function CheckInDialog({ reservation, onFinished }: { reservation: Reservation; onFinished: (id: string) => void }) {
    const { toast } = useToast();
    const { firestore } = useFirebase();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [inputCode, setInputCode] = useState('');
    
    const handleConfirmCheckIn = async () => {
        if (inputCode !== reservation.checkinCode) {
            toast({ variant: 'destructive', title: 'Código de Check-in Inválido' });
            return;
        }
        if (!firestore) return;
        setIsSubmitting(true);
        try {
            await updateDoc(doc(firestore, 'reservations', reservation.id), { status: 'checked-in' });
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
                    Peça ao cliente o código de 4 dígitos para confirmar o check-in.
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
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="ghost" disabled={isSubmitting}>Cancelar</Button></DialogClose>
                <Button onClick={handleConfirmCheckIn} disabled={isSubmitting || inputCode.length !== 4}>
                    {isSubmitting ? <Loader2 className="animate-spin" /> : 'Sim, Fazer Check-in'}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}

function PaymentDialog({ reservation, onFinished }: { reservation: Reservation; onFinished: () => void }) {
    const { toast } = useToast();
    const { firestore } = useFirebase();
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleConfirmPayment = async () => {
        if (!paymentMethod) {
            toast({ variant: 'destructive', title: 'Selecione um método de pagamento.'});
            return;
        };
        if (!firestore) return;
        setIsSubmitting(true);
        try {
            await updateDoc(doc(firestore, 'reservations', reservation.id), {
                status: 'completed',
                paymentMethod: paymentMethod,
            });
            toast({ title: 'Pagamento Confirmado!' });
            onFinished();
        } catch(error) {
            console.error("Error confirming payment: ", error);
            toast({ variant: 'destructive', title: 'Erro ao confirmar pagamento' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Confirmar Pagamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <p>Confirme o recebimento do valor de <span className="font-bold">R$ {reservation.total.toFixed(2)}</span> e selecione o método de pagamento utilizado pelo cliente.</p>
                <RadioGroup onValueChange={(value) => setPaymentMethod(value as PaymentMethod)} value={paymentMethod ?? undefined}>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="card" id="card" />
                        <Label htmlFor="card">Cartão</Label>
                    </div>
                     <div className="flex items-center space-x-2">
                        <RadioGroupItem value="pix" id="pix" />
                        <Label htmlFor="pix">PIX</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="cash" id="cash" />
                        <Label htmlFor="cash">Dinheiro</Label>
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


export default function OwnerReservationsPage() {
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  
  const [reservationForPayment, setReservationForPayment] = useState<Reservation | null>(null);
  const [reservationForCheckIn, setReservationForCheckIn] = useState<Reservation | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreatingChat, setIsCreatingChat] = useState<string | null>(null);

  const reservationsQuery = useMemoFirebase(
    () => (user && firestore) ? query(
        collection(firestore, 'reservations'),
        where('tentOwnerId', '==', user.uid)
      ) : null,
    [firestore, user]
  );
  const { data: rawReservations, isLoading: reservationsLoading } = useCollection<Reservation>(reservationsQuery);
  
  const reservations = useMemo(() => {
    if (!rawReservations) return [];
    // Sort locally after fetching
    return [...rawReservations].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  }, [rawReservations]);

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


  const handleCancelReservation = async (reservationId: string) => {
    if (!firestore) return;
    try {
        await updateDoc(doc(firestore, 'reservations', reservationId), { status: 'cancelled' });
        toast({ title: 'Reserva Cancelada!' });
    } catch(error) {
        console.error("Error cancelling reservation: ", error);
        toast({ variant: 'destructive', title: 'Erro ao cancelar reserva' });
    }
  };

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

  const handleItemStatusUpdate = async (reservationId: string, itemIndex: number, newStatus: 'confirmed' | 'cancelled') => {
    if (!firestore) return;
    const reservationRef = doc(firestore, 'reservations', reservationId);
    try {
        const docSnap = await getDoc(reservationRef);
        if(!docSnap.exists()) return;

        const reservationData = docSnap.data() as Reservation;
        const updatedItems = [...reservationData.items];
        const itemToUpdate = updatedItems[itemIndex];
        
        if (!itemToUpdate || itemToUpdate.status !== 'pending') return;

        updatedItems[itemIndex] = { ...itemToUpdate, status: newStatus };
        
        let newTotal = reservationData.total;
        if (newStatus === 'confirmed') {
            newTotal += itemToUpdate.price * itemToUpdate.quantity;
        }

        await updateDoc(reservationRef, { items: updatedItems, total: newTotal });
        toast({ title: `Item ${newStatus === 'confirmed' ? 'Confirmado' : 'Cancelado' }!` });

    } catch(error) {
        console.error("Error updating item status: ", error);
        toast({ variant: 'destructive', title: 'Erro ao atualizar status do item' });
    }
  }
  
  const handleStartChat = async (reservation: Reservation) => {
    if (!user || !firestore) return;
    setIsCreatingChat(reservation.id);
    
    try {
        const chatsRef = collection(firestore, 'chats');
        const q = query(chatsRef, 
            where('userId', '==', reservation.userId), 
            where('tentId', '==', reservation.tentId)
        );
        
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            await addDoc(chatsRef, {
                userId: reservation.userId,
                userName: reservation.userName,
                userPhotoURL: reservation.userPhotoURL || null,
                tentId: reservation.tentId,
                tentName: reservation.tentName,
                tentOwnerId: reservation.tentOwnerId,
                tentLogoUrl: reservation.tentLogoUrl || null,
                lastMessage: `Conversa iniciada...`,
                lastMessageTimestamp: serverTimestamp(),
                participantIds: [reservation.userId, reservation.tentOwnerId],
            });
        }
        
        router.push('/dashboard/chats');

    } catch (error) {
        console.error("Error starting chat:", error);
        toast({ variant: 'destructive', title: 'Erro ao iniciar conversa' });
    } finally {
        setIsCreatingChat(null);
    }
  };


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
    <Dialog>
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
            {filteredReservations.map((reservation) => {
                const pendingItems = reservation.items.map((item, index) => ({...item, originalIndex: index})).filter(item => item.status === 'pending');
                const nonPendingItems = reservation.items.filter(item => item.status !== 'pending');

                return (
                    <Card key={reservation.id} className="flex flex-col transition-all hover:shadow-md">
                        <CardHeader>
                            <div className='flex justify-between items-start'>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <UserIcon className="w-5 h-5"/>
                                    Reserva de {reservation.userName}
                                </CardTitle>
                                <Badge variant={statusConfig[reservation.status].variant}>
                                {statusConfig[reservation.status].text}
                                </Badge>
                            </div>
                            <div className='text-sm text-muted-foreground space-y-1 pt-2'>
                                <p className='flex items-center gap-2'><Hash className='w-4 h-4'/> Pedido: {reservation.orderNumber}</p>
                                <p className='flex items-center gap-2'><Calendar className='w-4 h-4'/>
                                {reservation.createdAt.toDate().toLocaleDateString('pt-BR', {
                                day: '2-digit', month: 'long', year: 'numeric',
                                })} às {reservation.reservationTime}
                                </p>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1">
                            {pendingItems.length > 0 && (
                                <div className="mb-4">
                                    <h4 className="flex items-center gap-2 text-sm font-semibold mb-2"><ChefHat className="w-4 h-4"/> Itens Pendentes</h4>
                                    <ul className="space-y-2 text-sm text-amber-800 bg-amber-50 p-3 rounded-md">
                                        {pendingItems.map((item) => (
                                            <li key={`pending-${item.originalIndex}`} className="flex justify-between items-center">
                                                <span>{item.quantity}x {item.name}</span>
                                                <div className="flex gap-1">
                                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={() => handleItemStatusUpdate(reservation.id, item.originalIndex, 'confirmed')}><Check className="w-4 h-4"/></Button>
                                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600" onClick={() => handleItemStatusUpdate(reservation.id, item.originalIndex, 'cancelled')}><X className="w-4 h-4"/></Button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {nonPendingItems.length > 0 && (
                                <>
                                    <h4 className="flex items-center gap-2 text-sm font-semibold mb-2 mt-4"><History className="w-4 h-4"/> Itens do Pedido</h4>
                                    <ul className="space-y-2 text-sm text-muted-foreground">
                                        {nonPendingItems.map((item, index) => (
                                            <li key={`confirmed-${index}`} className="flex justify-between">
                                                <span className={cn(item.status === 'cancelled' && 'line-through')}>{item.quantity}x {item.name}</span>
                                                <span className={cn(item.status === 'cancelled' && 'line-through')}>R$ {(item.price * item.quantity).toFixed(2)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}
                            <div className="mt-4 pt-4 border-t text-right">
                                <p className="text-sm font-medium text-muted-foreground">Total</p>
                                <p className='font-bold text-lg'>R$ {reservation.total.toFixed(2)}</p>
                            </div>
                        </CardContent>
                        <CardFooter className="flex-col gap-2">
                             {reservation.status === 'confirmed' && (
                                <div className="grid grid-cols-2 gap-2 w-full">
                                    <Button size="sm" onClick={() => setReservationForCheckIn(reservation)}>
                                        <Check className="mr-2 h-4 w-4" /> Fazer Check-in
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button size="sm" variant="destructive">
                                                <X className="mr-2 h-4 w-4" /> Cancelar
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Esta ação não pode ser desfeita e irá cancelar a reserva do cliente.
                                            </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                            <AlertDialogCancel>Voltar</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleCancelReservation(reservation.id)}>
                                                Sim, cancelar
                                            </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            )}
                            {reservation.status === 'checked-in' && (
                                <div className="w-full">
                                    <Button size="sm" variant="secondary" onClick={() => handleCloseBill(reservation.id)} className="w-full">
                                        <CreditCard className="mr-2 h-4 w-4" /> Fechar Conta do Cliente
                                    </Button>
                                </div>
                            )}
                            {reservation.status === 'payment-pending' && (
                                <div className="w-full">
                                    <Button size="sm" className="w-full" onClick={() => setReservationForPayment(reservation)}>
                                        <CreditCard className="mr-2 h-4 w-4" /> Confirmar Pagamento
                                    </Button>
                                </div>
                            )}
                            {['confirmed', 'checked-in', 'payment-pending', 'completed'].includes(reservation.status) && reservation.status !== 'cancelled' && (
                                <Button size="sm" variant="outline" className="w-full" onClick={() => handleStartChat(reservation)} disabled={isCreatingChat === reservation.id}>
                                    {isCreatingChat === reservation.id ? <Loader2 className="animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                                    Contactar Cliente
                                </Button>
                            )}
                             {reservation.status === 'completed' && reservation.paymentMethod && (
                                <div className="text-sm text-center w-full bg-green-50 text-green-700 p-2 rounded-md font-semibold">
                                    Pago com {paymentMethodLabels[reservation.paymentMethod]}
                                </div>
                            )}
                        </CardFooter>
                    </Card>
                )
            })}
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
        
        <Dialog open={!!reservationForPayment} onOpenChange={(open) => !open && setReservationForPayment(null)}>
            {reservationForPayment && <PaymentDialog reservation={reservationForPayment} onFinished={() => setReservationForPayment(null)} />}
        </Dialog>
        <Dialog open={!!reservationForCheckIn} onOpenChange={(open) => !open && setReservationForCheckIn(null)}>
            {reservationForCheckIn && <CheckInDialog reservation={reservationForCheckIn} onFinished={() => setReservationForCheckIn(null)} />}
        </Dialog>

    </Dialog>
  );
}
