
'use client';

import { Header } from '@/components/layout/header';
import { BeachMap } from '@/components/beach-map';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { Loader2 } from 'lucide-react';

export interface Tent {
  id: string;
  slug: string;
  name: string;
  description: string;
  images: any[];
  location: { lat: number; lng: number };
  minimumOrderForFeeWaiver?: number;
}

export default function Home() {
  const { db } = useFirebase();
  const tentsCollection = collection(db!, 'tents');
  const { data: tents, loading } = useCollection<Tent>(tentsCollection);

  if (loading || !tents) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Carregando barracas...</p>
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
