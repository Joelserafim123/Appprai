
'use client';

import { useUser } from '@/firebase/provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase/provider';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();
  const router = useRouter();
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [isCheckingReservations, setIsCheckingReservations] = useState(true);

  useEffect(() => {
    if (isUserLoading || !user || !firestore) {
      if (!isUserLoading) setIsCheckingReservations(false);
      return;
    }

    const checkReservations = async () => {
      setIsCheckingReservations(true);
      let reservationsQuery;
      let hasReservations = false;

      if (user.role === 'customer') {
        reservationsQuery = query(
          collection(firestore, 'reservations'),
          where('userId', '==', user.uid),
          limit(1)
        );
        const reservationsSnapshot = await getDocs(reservationsQuery);
        hasReservations = !reservationsSnapshot.empty;

      } else if (user.role === 'owner') {
        const tentQuery = query(collection(firestore, 'tents'), where('ownerId', '==', user.uid), limit(1));
        const tentSnapshot = await getDocs(tentQuery);
        if (!tentSnapshot.empty) {
          const tentId = tentSnapshot.docs[0].id;
          reservationsQuery = query(
            collection(firestore, 'reservations'),
            where('tentId', '==', tentId),
            limit(1)
          );
           const reservationsSnapshot = await getDocs(reservationsQuery);
           hasReservations = !reservationsSnapshot.empty;
        }
      }

      if (hasReservations) {
        setShouldRedirect(true);
      } else {
        setIsCheckingReservations(false);
      }
    };

    checkReservations();

  }, [user, isUserLoading, firestore]);

  useEffect(() => {
    if (shouldRedirect && user) {
        if (user.role === 'owner') {
            router.push('/dashboard/reservations');
        } else {
            router.push('/dashboard/my-reservations');
        }
    }
  }, [shouldRedirect, user, router]);


  if (isUserLoading || isCheckingReservations || shouldRedirect) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const welcomeMessage = () => {
    const firstName = user?.displayName?.split(' ')[0] || 'usuário';
    if (user?.role === 'owner') {
      return `Olá e boas vendas, ${firstName}!`;
    }
    return `Bem-vindo de volta, ${firstName}.`;
  };

  return (
    <div className="w-full max-w-2xl">
        <header className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Painel</h1>
            <p className="text-muted-foreground">{welcomeMessage()}</p>
        </header>
        <p>Use o menu à esquerda para navegar.</p>
    </div>
  );
}
