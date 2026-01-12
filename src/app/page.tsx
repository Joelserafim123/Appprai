
'use client';

import { Header } from '@/components/layout/header';
import { BeachMap } from '@/components/beach-map';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { Loader2 } from 'lucide-react';
import { useMemo } from 'react';
import { Logo } from '@/components/icons';
import { useMemoFirebase } from '@/firebase/provider';
import type { Tent as TentType } from '@/lib/types';

export default function Home() {
  const { firestore } = useFirebase();
  
  const tentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'tents');
  }, [firestore]);

  const { data: tents, isLoading: loading } = useCollection<TentType>(tentsQuery);

  if (loading || !tents) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
        <Logo />
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando barracas...</p>
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

    
