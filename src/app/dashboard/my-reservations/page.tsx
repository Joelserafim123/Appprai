
'use client';

import { useUser } from '@/firebase/provider';
import { useFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, where, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Star, Tent, Plus, CreditCard, User, X, Hourglass, MapPin, Check } from 'lucide-react';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useMemoFirebase } from '@/firebase/provider';
import type { Reservation, ReservationStatus, ReservationItemStatus, PaymentMethod } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cn } from '@/lib/utils';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"


const statusConfig: Record<ReservationStatus, { text: string; variant: "default" | "secondary" | "destructive" }> = {
  'confirmed': { text: 'Confirmada', variant: 'default' },
  'checked-in': { text: 'Check-in Feito', variant: 'default' },
  'payment-pending': { text: 'Pagamento Pendente', variant: 'destructive' },
  'completed': { text: 'Completa', variant: 'secondary' },
  'cancelled': { text: 'Cancelada', variant: 'destructive' }
};

const itemStatusConfig: Record<ReservationItemStatus, { text: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  'pending': { text: 'Pendente', color: 'text-amber-600', icon: Hourglass },
  'confirmed': { text: 'Confirmado', color: 'text-green-600', icon: Check },
  'cancelled': { text: 'Cancelado', color: 'text-red-600', icon: X },
}

const paymentMethodLabels: Record<PaymentMethod, string> = {
    card: 'Cartão',
    cash: 'Dinheiro',
    pix: 'PIX'
}


export default function MyReservationsPage() {
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const reservationsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'reservations'),
      where('userId', '==', user.uid)
    );
  }, [firestore, user]);

  const { data: reservations, isLoading: reservationsLoading, error } = useCollection<Reservation>(reservationsQuery);

  const sortedReservations = useMemo(() => {
    if (!reservations) return [];
    return [...reservations].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  }, [reservations]);
  
  const handleCloseBill = (reservationId: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'reservations', reservationId);
    const updateData = { status: 'payment-pending' };
    updateDoc(docRef, updateData)
    .catch(e => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: updateData,
        }));
        if (e.code !== 'permission-denied') {
            toast({ variant: 'destructive', title: 'Erro ao fechar a conta' });
        }
    })
  }
  
  const handleCancelReservation = (reservationId: string) => {
    if (!firestore) return;
    const resDocRef = doc(firestore, 'reservations', reservationId);
    const updateData = { status: 'cancelled' };
    updateDoc(resDocRef, updateData).catch(err => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: resDocRef.path,
            operation: 'update',
            requestResourceData: updateData
        }));
        if (err.code !== 'permission-denied') {
            toast({ variant: 'destructive', title: 'Erro ao cancelar reserva' });
        }
    });
  }


  if (isUserLoading || (reservationsLoading && !reservations)) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <p>Por favor, faça login para ver suas reservas.</p>;
  }
  
  if (error) {
      return <p className='text-destructive'>Erro ao carregar reservas: {error.message}</p>
  }

  return (
    <div className="w-full max-w-4xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Minhas Reservas</h1>
        <p className="text-muted-foreground">Aqui está o histórico de todas as suas reservas.</p>
      </header>

      {sortedReservations && sortedReservations.length > 0 ? (
        <TooltipProvider>
          <div className="space-y-6">
            {sortedReservations.map((reservation) => (
              <Card key={reservation.id} className="transition-all hover:shadow-md">
                <CardHeader className='flex-row justify-between items-start'>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Tent className="w-5 h-5"/>
                      {reservation.tentName}
                    </CardTitle>
                    <CardDescription className="space-y-1 mt-1">
                      <p className='flex items-center gap-2 text-xs'><User className="w-3 h-3"/> Por: {reservation.tentOwnerName}</p>
                      <p>
                          {reservation.createdAt.toDate().toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                          })} às {reservation.reservationTime}
                      </p>
                    </CardDescription>
                  </div>
                  <div className='text-right space-y-2'>
                      <Badge variant={statusConfig[reservation.status].variant}>
                          {statusConfig[reservation.status].text}
                      </Badge>
                      {['confirmed', 'checked-in'].includes(reservation.status) && (
                          <div className="flex items-center gap-2 justify-end">
                              <div className="text-sm text-center font-mono tracking-widest bg-muted p-2 rounded-lg">
                                  <p className="text-xs text-muted-foreground">Nº do Pedido</p>
                                  <p className="font-bold text-lg">{reservation.orderNumber}</p>
                              </div>
                            {reservation.status === 'confirmed' && (
                              <div className="text-sm text-center font-mono tracking-widest bg-primary/10 p-2 rounded-lg text-primary">
                                  <p className="text-xs text-primary/80">Cód. Check-in</p>
                                  <p className="font-bold text-lg">{reservation.checkinCode}</p>
                              </div>
                            )}
                          </div>
                      )}
                  </div>
                </CardHeader>
                <CardContent>
                  {reservation.status === 'payment-pending' && (
                      <div className="mb-4 rounded-lg border border-dashed border-amber-500 bg-amber-50 p-4 text-center">
                          <Hourglass className="mx-auto h-8 w-8 text-amber-600 mb-2" />
                          <h4 className="font-semibold text-amber-800">Aguardando Pagamento</h4>
                          <p className="text-sm text-amber-700">O dono da barraca precisa confirmar o recebimento para finalizar o pedido.</p>
                      </div>
                  )}
                  <ul className="space-y-2 text-sm text-muted-foreground">
                      {reservation.items.map((item, index) => {
                        const StatusIcon = item.status ? itemStatusConfig[item.status]?.icon : null;
                        return (
                          <li key={`${item.name}-${index}`} className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                {StatusIcon && <StatusIcon className={cn("w-3 h-3", item.status ? itemStatusConfig[item.status].color : '')}/>}
                                <span>{item.quantity}x {item.name}</span>
                              </div>
                              <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
                          </li>
                        )
                      })}
                  </ul>
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="text-right w-full sm:w-auto">
                      <p className="text-sm font-medium text-muted-foreground">Total</p>
                      <p className='font-bold text-lg'>R$ {reservation.total.toFixed(2)}</p>
                  </div>
                  <div className='flex gap-2 w-full sm:w-auto justify-end flex-wrap'>
                      {reservation.status === 'completed' && reservation.paymentMethod && (
                          <div className="text-sm text-center w-full bg-green-50 text-green-700 p-2 rounded-md font-semibold">
                              Pago com {paymentMethodLabels[reservation.paymentMethod]}
                          </div>
                      )}
                      {reservation.tentLocation && ['confirmed', 'checked-in'].includes(reservation.status) && (
                          <Button asChild variant="outline">
                              <a href={`https://www.google.com/maps/dir/?api=1&destination=${reservation.tentLocation.latitude},${reservation.tentLocation.longitude}`} target="_blank" rel="noopener noreferrer">
                                  <MapPin className="mr-2 h-4 w-4"/> Como Chegar
                              </a>
                          </Button>
                      )}
                      {reservation.status === 'checked-in' && (
                          <>
                              <Button asChild className='flex-1'>
                                  <Link href={`/dashboard/order/${reservation.id}`}>
                                      <Plus className="mr-2 h-4 w-4"/> Adicionar Itens
                                  </Link>
                              </Button>
                              <Button onClick={() => handleCloseBill(reservation.id)} variant="secondary" className='flex-1'>
                                  <CreditCard className="mr-2 h-4 w-4"/> Fechar Conta
                              </Button>
                          </>
                      )}
                      {reservation.status === 'confirmed' && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive">
                                <X className="mr-2 h-4 w-4"/> Cancelar Reserva
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. Isso cancelará permanentemente sua reserva.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Voltar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleCancelReservation(reservation.id)}>
                                  Sim, cancelar reserva
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                      )}
                      {reservation.status === 'checked-in' && (
                          <Tooltip>
                              <TooltipTrigger asChild>
                                  <div className="cursor-not-allowed">
                                      <Button variant="destructive" disabled>
                                          <X className="mr-2 h-4 w-4"/> Cancelar Reserva
                                      </Button>
                                  </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                  <p>Não é possível cancelar uma reserva após o check-in.</p>
                              </TooltipContent>
                          </Tooltip>
                      )}
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TooltipProvider>
      ) : (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <Star className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">Nenhuma reserva encontrada</h3>
            <p className="mt-2 text-sm text-muted-foreground">Você ainda não fez nenhuma reserva.</p>
            <Button asChild className="mt-6">
                <Link href="/">Encontrar uma barraca</Link>
            </Button>
        </div>
      )}
    </div>
  );
}
