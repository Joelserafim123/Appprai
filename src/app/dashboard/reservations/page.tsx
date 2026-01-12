
'use client';

import { useUser } from '@/firebase/provider';
import { useFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, where, orderBy, Timestamp, doc, updateDoc, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Star, User as UserIcon, Calendar, Hash } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useMemoFirebase } from '@/firebase/provider';

type ReservationItem = {
  name: string;
  quantity: number;
  price: number;
};

type Reservation = {
  id: string;
  tentId: string;
  tentName: string;
  userId: string;
  total: number;
  createdAt: Timestamp;
  status: 'confirmed' | 'cancelled' | 'completed';
  items: ReservationItem[];
};

export default function OwnerReservationsPage() {
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [tentId, setTentId] = useState<string | null>(null);

  useEffect(() => {
    if (firestore && user) {
      const getTentId = async () => {
        const tentsRef = collection(firestore, 'tents');
        const q = query(tentsRef, where('ownerId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setTentId(querySnapshot.docs[0].id);
        }
      };
      getTentId();
    }
  }, [firestore, user]);

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


  const handleUpdateStatus = (reservationId: string, status: 'confirmed' | 'cancelled' | 'completed') => {
    if (!firestore) return;
    const resDocRef = doc(firestore, 'reservations', reservationId);
    
    updateDoc(resDocRef, { status })
      .then(() => {
        toast({ title: 'Status da Reserva Atualizado!' });
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: resDocRef.path,
          operation: 'update',
          requestResourceData: { status },
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({ variant: 'destructive', title: 'Erro ao atualizar status.' });
      });
  };

  if (isUserLoading || (reservationsLoading && !reservations)) {
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

  return (
    <div className="w-full max-w-6xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Reservas da Barraca</h1>
        <p className="text-muted-foreground">Gerencie todas as reservas para sua barraca.</p>
      </header>

      {sortedReservations && sortedReservations.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sortedReservations.map((reservation) => (
            <Card key={reservation.id}>
              <CardHeader>
                <div className='flex justify-between items-start'>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <UserIcon className="w-5 h-5"/>
                        Reserva
                    </CardTitle>
                    <Badge variant={reservation.status === 'confirmed' ? 'default' : reservation.status === 'completed' ? 'secondary' : 'destructive'}>
                        {reservation.status === 'confirmed' && 'Confirmada'}
                        {reservation.status === 'cancelled' && 'Cancelada'}
                        {reservation.status === 'completed' && 'Completa'}
                    </Badge>
                </div>
                <CardDescription className='space-y-1 pt-2'>
                    <p className='flex items-center gap-2'><Hash className='w-4 h-4'/> ID: {reservation.id.substring(0, 8)}</p>
                    <p className='flex items-center gap-2'><Calendar className='w-4 h-4'/>
                    {reservation.createdAt.toDate().toLocaleDateString('pt-BR', {
                      day: '2-digit', month: 'long', year: 'numeric',
                    })}
                    </p>
                </CardDescription>
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
                <div className="mt-4 pt-4 border-t text-right">
                    <p className="text-sm font-medium text-muted-foreground">Total</p>
                    <p className='font-bold text-lg'>R$ {reservation.total.toFixed(2)}</p>
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-2">
                 <p className="text-xs text-muted-foreground w-full text-left">Atualizar Status:</p>
                 <div className="grid grid-cols-3 gap-2 w-full">
                    <Button size="sm" variant={reservation.status === 'confirmed' ? 'default' : 'outline'} onClick={() => handleUpdateStatus(reservation.id, 'confirmed')}>Confirmar</Button>
                    <Button size="sm" variant={reservation.status === 'completed' ? 'secondary' : 'outline'} onClick={() => handleUpdateStatus(reservation.id, 'completed')}>Completar</Button>
                    <Button size="sm" variant={reservation.status === 'cancelled' ? 'destructive' : 'outline'} onClick={() => handleUpdateStatus(reservation.id, 'cancelled')}>Cancelar</Button>
                 </div>
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
  );
}
