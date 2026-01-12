
'use client';

import { useUser } from '@/firebase/provider';
import { useFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Star, Tent } from 'lucide-react';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useMemoFirebase } from '@/firebase/provider';

type ReservationItem = {
  name: string;
  quantity: number;
  price: number;
};

type Reservation = {
  id: string;
  tentName: string;
  total: number;
  createdAt: Timestamp;
  status: 'confirmed' | 'cancelled' | 'completed';
  items: ReservationItem[];
};

export default function MyReservationsPage() {
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();

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
            <Card key={reservation.id}>
              <CardHeader className='flex-row justify-between items-start'>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Tent className="w-5 h-5"/>
                    {reservation.tentName}
                  </CardTitle>
                  <CardDescription>
                    {reservation.createdAt.toDate().toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </CardDescription>
                </div>
                 <Badge variant={reservation.status === 'confirmed' ? 'default' : reservation.status === 'completed' ? 'secondary' : 'destructive'}>
                    {reservation.status === 'confirmed' && 'Confirmada'}
                    {reservation.status === 'cancelled' && 'Cancelada'}
                    {reservation.status === 'completed' && 'Completa'}
                </Badge>
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
              <CardFooter className="flex justify-end font-bold text-lg">
                <div className="text-right">
                    <p className="text-sm font-medium text-muted-foreground">Total</p>
                    <p>R$ {reservation.total.toFixed(2)}</p>
                </div>
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
