
'use client';

import { Header } from '@/components/layout/header';
import { BeachMap } from '@/components/beach-map';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection } from 'firebase/firestore';
import { useFirebase, useUser } from '@/firebase/provider';
import { Loader2 } from 'lucide-react';
import { useMemo, useEffect } from 'react';
import { Logo } from '@/components/icons';
import { useMemoFirebase } from '@/firebase/provider';
import type { Tent as TentType } from '@/lib/types';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  
  const tentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'tents');
  }, [firestore]);

  const { data: tents, isLoading: loadingTents } = useCollection<TentType>(tentsQuery);

  useEffect(() => {
    if (!isUserLoading && user?.role === 'owner') {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || loadingTents || !tents || (user && user.role === 'owner')) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
        <Logo />
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1 overflow-hidden">
        <BeachMap tents={tents} />
      </main>
    </div>
  );
}
