'use client';

import { Header } from '@/components/layout/header';
import { BeachMap } from '@/components/beach-map';
import { Loader2, Tent as TentIcon } from 'lucide-react';
import type { Tent as TentType } from '@/lib/types';
import { Logo } from '@/components/icons';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';


export default function HomePage() {
  const { db } = useFirebase();
  const tentsQuery = useMemoFirebase(() => (db ? collection(db, 'tents') : null), [db]);
  const { data: tents, isLoading: isLoading } = useCollection<TentType>(tentsQuery);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
        <Logo />
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando mapa...</p>
        </div>
      </div>
    );
  }

  if (!tents || tents.length === 0) {
    return (
       <div className="flex h-screen flex-col bg-background text-foreground">
         <Header />
         <main className="flex-1 flex items-center justify-center text-center p-4">
           <div className="border-2 border-dashed rounded-lg p-12">
             <TentIcon className="mx-auto h-12 w-12 text-muted-foreground" />
             <h3 className="mt-4 text-xl font-medium">Nenhuma barraca encontrada</h3>
             <p className="mt-2 text-sm text-muted-foreground">
               Parece que ainda não há barracas cadastradas no BeachPal.
             </p>
           </div>
         </main>
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
