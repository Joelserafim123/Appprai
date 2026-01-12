
'use client';

import { useUser } from '@/firebase/provider';
import { useFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, where, Timestamp, doc, updateDoc, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Star, User as UserIcon, Calendar, Hash, Check, X, CreditCard, Scan } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useMemoFirebase } from '@/firebase/provider';
import type { Reservation, ReservationStatus, PaymentMethod } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

const statusConfig: Record<ReservationStatus, { text: string; variant: "default" | "secondary" | "destructive" }> = {
  'confirmed': { text: 'Confirmada', variant: 'default' },
  'checked-in': { text: 'Check-in Feito', variant: 'default' },
  'payment-pending': { text: 'Pagamento Pendente', variant: 'destructive' },
  'completed': { text: 'Completa', variant: 'secondary' },
  'cancelled': { text: 'Cancelada', variant: 'destructive' }
};

function CheckInDialog({ reservation, onFinished }: { reservation: Reservation; onFinished: () => void }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [tableNumber, setTableNumber] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleConfirmCheckIn = () => {
        if (!firestore || !tableNumber) {
            toast({ variant: 'destructive', title: 'Por favor, insira o número da mesa.' });
            return;
        }

        setIsSubmitting(true);
        const docRef = doc(firestore, 'reservations', reservation.id);
        const updates = {
            status: 'checked-in' as ReservationStatus,
            tableNumber: parseInt(tableNumber, 10)
        };

        updateDoc(docRef, updates)
            .then(() => {
                toast({ title: 'Check-in realizado com sucesso!' });
                onFinished();
            })
            .catch(e => {
                const permissionError = new FirestorePermissionError({
                    path: docRef.path,
                    operation: 'update',
                    requestResourceData: updates,
                });
                errorEmitter.emit('permission-error', permissionError);
            })
            .finally(() => setIsSubmitting(false));
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Fazer Check-in</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <p>Insira o número da mesa para o cliente antes de confirmar o check-in.</p>
                <div className="space-y-2">
                    <Label htmlFor="tableNumber">Número da Mesa</Label>
                    <Input 
                        id="tableNumber" 
                        type="number" 
                        value={tableNumber} 
                        onChange={(e) => setTableNumber(e.target.value)} 
                        placeholder="Ex: 15"
                        disabled={isSubmitting}
                    />
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="ghost" disabled={isSubmitting}>Cancelar</Button></DialogClose>
                <Button onClick={handleConfirmCheckIn} disabled={!tableNumber || isSubmitting}>
                    {isSubmitting ? <Loader2 className="animate-spin" /> : 'Confirmar Check-in'}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}

function PaymentDialog({ reservation, onFinished }: { reservation: Reservation; onFinished: () => void }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleConfirmPayment = () => {
        if (!firestore || !paymentMethod) {
            toast({ variant: 'destructive', title: 'Selecione um método de pagamento.'});
            return;
        };

        setIsSubmitting(true);
        const docRef = doc(firestore, 'reservations', reservation.id);
        
        updateDoc(docRef, { status: 'completed', paymentMethod })
            .then(() => {
                toast({ title: 'Pagamento Confirmado!' });
                onFinished();
            })
            .catch(e => {
                const permissionError = new FirestorePermissionError({
                    path: docRef.path,
                    operation: 'update',
                    requestResourceData: { status: 'completed', paymentMethod },
                });
                errorEmitter.emit('permission-error', permissionError);
            })
            .finally(() => setIsSubmitting(false));
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
  const [tentId, setTentId] = useState<string | null>(null);
  const [loadingTent, setLoadingTent] = useState(true);
  const [reservationForPayment, setReservationForPayment] = useState<Reservation | null>(null);
  const [reservationForCheckIn, setReservationForCheckIn] = useState<Reservation | null>(null);

  useEffect(() => {
     if (isUserLoading) {
        setLoadingTent(true);
        return;
    }
    if (firestore && user && user.role === 'owner') {
      setLoadingTent(true);
      const getTentId = async () => {
        const tentsRef = collection(firestore, 'tents');
        const q = query(tentsRef, where('ownerId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setTentId(querySnapshot.docs[0].id);
        }
         setLoadingTent(false);
      };
      getTentId();
    } else {
        setLoadingTent(false);
    }
  }, [firestore, user, isUserLoading]);

  const reservationsQuery = useMemoFirebase(() => {
    if (!firestore || !tentId) return null;
    return query(
      collection(firestore, 'reservations'),
      where('tentId', '==', tentId)
    );
  }, [firestore, tentId]);

  const { data: reservations, isLoading: reservationsLoading, error } = useCollection<Reservation>(reservationsQuery);

  const sortedReservations = useMemo(() => {
    if (!reservations) return [];
    return [...reservations].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  }, [reservations]);


  const handleCancelReservation = (reservationId: string) => {
    if (!firestore || !confirm('Tem certeza que deseja cancelar esta reserva?')) return;
    const resDocRef = doc(firestore, 'reservations', reservationId);
    
    updateDoc(resDocRef, { status: 'cancelled' })
      .then(() => {
        toast({ title: 'Reserva Cancelada!' });
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: resDocRef.path,
          operation: 'update',
          requestResourceData: { status: 'cancelled' },
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  if (isUserLoading || loadingTent) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== 'owner') {
    return <p>Acesso negado. Esta página é apenas para donos de barracas.</p>;
  }
  
  if (error) {
      return <p className='text-destructive'>Erro ao carregar reservas: {error.message}</p>
  }
  
  if (reservationsLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }


  return (
    <Dialog>
        <div className="w-full max-w-6xl">
        <header className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Reservas da Barraca</h1>
            <p className="text-muted-foreground">Gerencie todas as reservas para sua barraca.</p>
        </header>

        {sortedReservations && sortedReservations.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sortedReservations.map((reservation) => (
                <Card key={reservation.id} className="flex flex-col transition-all hover:shadow-md">
                <CardHeader>
                    <div className='flex justify-between items-start'>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <UserIcon className="w-5 h-5"/>
                            Reserva
                        </CardTitle>
                         <Badge variant={statusConfig[reservation.status].variant}>
                           {statusConfig[reservation.status].text}
                        </Badge>
                    </div>
                    <CardDescription className='space-y-1 pt-2'>
                        <p className='flex items-center gap-2'><Hash className='w-4 h-4'/> ID: {reservation.id.substring(0, 8)}</p>
                        <p className='flex items-center gap-2'><Calendar className='w-4 h-4'/>
                        {reservation.createdAt.toDate().toLocaleDateString('pt-BR', {
                        day: '2-digit', month: 'long', year: 'numeric',
                        })}
                        </p>
                         {reservation.tableNumber && (
                           <p className="font-semibold flex items-center gap-2 pt-1"><Scan className="w-4 h-4"/> Mesa {reservation.tableNumber}</p>
                        )}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                    <ul className="space-y-2 text-sm text-muted-foreground">
                        {reservation.items.map((item, index) => (
                            <li key={`${item.name}-${index}`} className="flex justify-between">
                                <span>{item.quantity}x {item.name}</span>
                                <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
                            </li>
                        ))}
                    </ul>
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
                            <Button size="sm" variant="destructive" onClick={() => handleCancelReservation(reservation.id)}>
                                <X className="mr-2 h-4 w-4" /> Cancelar
                            </Button>
                        </div>
                    )}
                    {reservation.status === 'checked-in' && (
                         <Button size="sm" variant="destructive" className="w-full" onClick={() => handleCancelReservation(reservation.id)}>
                            <X className="mr-2 h-4 w-4" /> Cancelar Pedido
                        </Button>
                    )}
                     {reservation.status === 'payment-pending' && (
                        <Button className="w-full" onClick={() => setReservationForPayment(reservation)}>
                             <CreditCard className="mr-2 h-4 w-4" /> Confirmar Pagamento
                        </Button>
                    )}
                </CardFooter>
                </Card>
            ))}
            </div>
        ) : (
            <div className="rounded-lg border-2 border-dashed py-16 text-center">
                <Star className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">Nenhuma reserva encontrada</h3>
                <p className="mt-2 text-sm text-muted-foreground">Sua barraca ainda não recebeu nenhuma reserva.</p>
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
