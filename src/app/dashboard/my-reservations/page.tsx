
'use client';

import { useUser } from '@/firebase/provider';
import { useFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, where, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Star, Tent, Plus, CreditCard, Scan, User } from 'lucide-react';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useMemoFirebase } from '@/firebase/provider';
import type { Reservation, ReservationStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cn } from '@/lib/utils';


const statusConfig: Record<ReservationStatus, { text: string; variant: "default" | "secondary" | "destructive" }> = {
  'confirmed': { text: 'Confirmada', variant: 'default' },
  'checked-in': { text: 'Check-in Feito', variant: 'default' },
  'payment-pending': { text: 'Pagamento Pendente', variant: 'destructive' },
  'completed': { text: 'Completa', variant: 'secondary' },
  'cancelled': { text: 'Cancelada', variant: 'destructive' }
};

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
    if (!firestore || !confirm("Tem certeza que deseja fechar a conta? Você não poderá adicionar mais itens.")) return;
    const docRef = doc(firestore, 'reservations', reservationId);
    updateDoc(docRef, { status: 'payment-pending' })
    .catch(e => {
       const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: { status: 'payment-pending' },
        });
        errorEmitter.emit('permission-error', permissionError);
    })
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
                        })}
                    </p>
                  </CardDescription>
                </div>
                 <div className='text-right'>
                     <Badge variant={statusConfig[reservation.status].variant}>
                        {statusConfig[reservation.status].text}
                    </Badge>
                    {reservation.status === 'checked-in' && reservation.tableNumber && (
                        <p className="text-sm mt-2 font-semibold flex items-center justify-end gap-2"><Scan className="w-4 h-4"/> Mesa {reservation.tableNumber}</p>
                    )}
                 </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                    {reservation.items.map((item, index) => (
                        <li key={`${item.name}-${index}`} className="flex justify-between">
                            <span>{item.quantity}x {item.name}</span>
                            <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
                        </li>
                    ))}
                </ul>
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4">
                 <div className="text-right w-full sm:w-auto">
                    <p className="text-sm font-medium text-muted-foreground">Total</p>
                    <p className='font-bold text-lg'>R$ {reservation.total.toFixed(2)}</p>
                </div>
                {reservation.status === 'checked-in' && (
                    <div className='flex gap-2 w-full sm:w-auto'>
                        <Button asChild className='flex-1'>
                             <Link href={`/dashboard/order/${reservation.id}`}>
                                <Plus className="mr-2 h-4 w-4"/> Adicionar Itens
                            </Link>
                        </Button>
                         <Button onClick={() => handleCloseBill(reservation.id)} variant="secondary" className='flex-1'>
                            <CreditCard className="mr-2 h-4 w-4"/> Fechar Conta
                        </Button>
                    </div>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
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
