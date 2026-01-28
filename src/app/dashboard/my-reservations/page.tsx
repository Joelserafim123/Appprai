'use client';

import { useUser, useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Star, User, X, MapPin, AlertCircle, AlertTriangle, CreditCard, Check, Eye, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { Reservation, ReservationStatus, PaymentMethod } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { collection, query, where, doc, updateDoc, writeBatch, increment, getDocs, addDoc, serverTimestamp, limit, orderBy } from 'firebase/firestore';
import { useMemo, useState } from 'react';
import { ReviewDialog } from '@/components/reviews/review-dialog';
import { useTranslations } from '@/i18n';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';


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

export default function MyReservationsPage() {
  const { user, isUserLoading, refresh } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const t_products = useTranslations('Shared.ProductNames');
  const [reservationToCancel, setReservationToCancel] = useState<Reservation | null>(null);
  const [reservationToReview, setReservationToReview] = useState<Reservation | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  
  const reservationsQuery = useMemoFirebase(
    () => (user && firestore) ? query(
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
      .filter(r => r.userId === user.uid)
      .sort((a, b) => {
        const timeA = a.creationTimestamp?.toMillis() || a.createdAt.toMillis();
        const timeB = b.creationTimestamp?.toMillis() || b.createdAt.toMillis();
        return timeB - timeA;
      });
  }, [rawReservations, user]);

  const isLateCancellation = useMemo(() => {
    if (!reservationToCancel) return false;
    const now = new Date();
    const reservationDate = reservationToCancel.createdAt.toDate();
    const [hours, minutes] = reservationToCancel.reservationTime.split(':').map(Number);
    const reservationDateTime = new Date(reservationDate.getFullYear(), reservationDate.getMonth(), reservationDate.getDate(), hours, minutes);
    
    return reservationDateTime.getTime() - now.getTime() < 15 * 60 * 1000;
  }, [reservationToCancel]);

  const handleCancelReservation = async () => {
    if (!firestore || !user || !reservationToCancel) return;
    setIsCancelling(true);

    try {
        const batch = writeBatch(firestore);
        const reservationRef = doc(firestore, 'reservations', reservationToCancel.id);
        const userRef = doc(firestore, 'users', user.uid);
        
        let feeApplied = false;

        if (isLateCancellation) {
            batch.update(reservationRef, { 
                status: 'cancelled',
                cancellationFee: 3,
                cancellationReason: 'client_late',
            });
            batch.update(userRef, {
                outstandingBalance: increment(3)
            });
            feeApplied = true;
        } else {
            batch.update(reservationRef, { status: 'cancelled' });
        }
        
        const chatsRef = collection(firestore, 'chats');
        const q = query(chatsRef, where('reservationId', '==', reservationToCancel.id), limit(1));
        const chatSnapshot = await getDocs(q);

        if (!chatSnapshot.empty) {
            batch.update(chatSnapshot.docs[0].ref, { status: 'archived' });
        }

       await batch.commit();
       toast({ 
           title: "Reserva Cancelada",
           description: feeApplied ? "Uma taxa de R$ 3,00 foi adicionada à sua conta por cancelamento tardio." : "A sua reserva foi cancelada com sucesso.",
           variant: feeApplied ? 'destructive' : 'default',
        });
       await refresh();
    } catch (error) {
        console.error("Error cancelling reservation: ", error);
        toast({ variant: 'destructive', title: "Erro ao cancelar reserva"});
    } finally {
        setIsCancelling(false);
        setReservationToCancel(null);
    }
  }

  const handleStartChat = (reservation: Reservation) => {
    router.push(`/dashboard/chats?reservationId=${reservation.id}`);
  };


  if (isUserLoading || (reservationsLoading && !rawReservations)) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.isAnonymous) {
    return <p>Por favor, faça login para ver suas reservas.</p>;
  }

  return (
    <div className="w-full max-w-4xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Minhas Reservas</h1>
        <p className="text-muted-foreground">Aqui está o histórico de todas as suas reservas.</p>
      </header>

      {reservations && reservations.length > 0 ? (
        <TooltipProvider>
          <div className="space-y-6">
            {reservations.map((reservation) => (
              <Card key={reservation.id} className="transition-all hover:shadow-md">
                <CardHeader className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={reservation.tentLogoUrl ?? undefined} alt={reservation.tentName} />
                      <AvatarFallback>{getInitials(reservation.tentName)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle>{reservation.tentName}</CardTitle>
                      <div className="text-sm text-muted-foreground space-y-1 mt-1">
                        <p className='flex items-center gap-2 text-xs'><User className="w-3 h-3"/> Por: {reservation.tentOwnerName}</p>
                        <p>
                            {reservation.createdAt.toDate().toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                            })} às {reservation.reservationTime}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className='flex flex-col items-start sm:items-end gap-2'>
                      <Badge variant={statusConfig[reservation.status].variant}>
                          {statusConfig[reservation.status].text}
                      </Badge>
                      {['confirmed', 'checked-in'].includes(reservation.status) && (
                          <div className="flex items-center gap-2 justify-start sm:justify-end flex-wrap">
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
                  <ul className="space-y-2 text-sm text-muted-foreground">
                      {reservation.items.map((item, index) => {
                        const isRental = ['Kit Guarda-sol + 2 Cadeiras', 'Cadeira Adicional'].includes(item.name);
                        return (
                          <li key={`${item.name}-${index}`} className="flex justify-between">
                              <span>{item.quantity}x {isRental ? t_products(item.name as 'Kit Guarda-sol + 2 Cadeiras' | 'Cadeira Adicional') : item.name}</span>
                              <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
                          </li>
                        )
                      })}
                      {reservation.outstandingBalancePaid && reservation.outstandingBalancePaid > 0 && (
                        <li className="flex justify-between font-semibold text-destructive">
                            <span>Taxa de cancelamento anterior</span>
                            <span>R$ {reservation.outstandingBalancePaid.toFixed(2)}</span>
                        </li>
                      )}
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
                       {reservation.status === 'checked-in' && (
                          <Button asChild>
                              <Link href={`/dashboard/order/${reservation.id}`}>
                                  <Utensils className="mr-2 h-4 w-4"/> Adicionar Itens ao Pedido
                              </Link>
                          </Button>
                        )}
                      {reservation.status === 'completed' && !reservation.reviewed && (
                          <Button variant="outline" onClick={() => setReservationToReview(reservation)} className="w-full">
                              <Star className="mr-2 h-4 w-4" /> Avaliar Experiência
                          </Button>
                      )}
                      {reservation.status === 'completed' && reservation.reviewed && (
                          <Button variant="outline" disabled className="w-full">
                              <Check className="mr-2 h-4 w-4" /> Avaliação Enviada
                          </Button>
                      )}
                      {reservation.status === 'payment-pending' && (
                        <div className="p-3 bg-blue-50 text-blue-800 rounded-md text-center text-sm w-full font-semibold flex items-center justify-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            <p>Dirija-se ao caixa para efetuar o pagamento.</p>
                        </div>
                      )}
                      {reservation.tentLocation && ['confirmed', 'checked-in'].includes(reservation.status) && (
                          <Button asChild variant="outline">
                              <a href={`https://www.google.com/maps/dir/?api=1&destination=${reservation.tentLocation.latitude},${reservation.tentLocation.longitude}`} target="_blank" rel="noopener noreferrer">
                                  <MapPin className="mr-2 h-4 w-4"/> Como Chegar
                              </a>
                          </Button>
                      )}
                       {['confirmed', 'checked-in', 'payment-pending'].includes(reservation.status) && reservation.status !== 'cancelled' && (
                          <Button variant="outline" onClick={() => handleStartChat(reservation)}>
                              <Eye className="mr-2 h-4 w-4"/>
                              Ver Conversa
                          </Button>
                      )}
                      {reservation.status === 'confirmed' && (
                        <Button variant="destructive" onClick={() => setReservationToCancel(reservation)}>
                            <X className="mr-2 h-4 w-4"/> Cancelar Reserva
                        </Button>
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
       <AlertDialog open={!!reservationToCancel} onOpenChange={(open) => !open && setReservationToCancel(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                    {isLateCancellation 
                        ? "Esta ação não pode ser desfeita. Isso cancelará permanentemente sua reserva e uma taxa será aplicada."
                        : "Esta ação não pode ser desfeita. Isso cancelará permanentemente sua reserva sem custos."
                    }
                </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-4 pt-2">
                    {isLateCancellation && (
                        <div className="p-3 rounded-md bg-destructive/10 text-destructive-foreground flex items-center gap-3">
                            <AlertCircle className="h-5 w-5 text-destructive" />
                            <div>
                                <div className="font-bold">Será aplicada uma taxa de R$ 3,00.</div>
                                <div className="text-xs">Você está a cancelar a menos de 15 minutos do horário da reserva. Esta taxa será cobrada na sua próxima reserva.</div>
                            </div>
                        </div>
                    )}
                    <div className="p-3 rounded-md bg-muted/50 border flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                        <div>
                            <div className="font-bold text-foreground">Aviso sobre a Política de Uso</div>
                            <div className="text-xs text-muted-foreground">Cancelamentos frequentes podem levar à suspensão ou ao encerramento da sua conta na plataforma.</div>
                        </div>
                    </div>
                </div>
                <AlertDialogFooter>
                <AlertDialogCancel disabled={isCancelling}>Voltar</AlertDialogCancel>
                <AlertDialogAction onClick={handleCancelReservation} disabled={isCancelling}>
                    {isCancelling ? <Loader2 className="animate-spin" /> : "Sim, cancelar reserva"}
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        <Dialog open={!!reservationToReview} onOpenChange={(open) => !open && setReservationToReview(null)}>
            {reservationToReview && <ReviewDialog reservation={reservationToReview} onFinished={() => { setReservationToReview(null); refresh(); }} />}
        </Dialog>
    </div>
  );
}
