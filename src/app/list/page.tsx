'use client';

import { Header } from '@/components/layout/header';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query } from 'firebase/firestore';
import { useFirebase, useUser } from '@/firebase/provider';
import { Loader2, Search } from 'lucide-react';
import { useEffect } from 'react';
import { Logo } from '@/components/icons';
import { useMemoFirebase } from '@/firebase/provider';
import type { Tent as TentType } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { useSearchStore } from '@/hooks/use-search';
import { Button } from '@/components/ui/button';

export default function ListPage() {
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  const { searchTerm, setSearchTerm, filteredTents, setFilteredTents } = useSearchStore();

  const tentsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'tents'));
  }, [firestore, user]);

  const { data: tents, isLoading: loadingTents } = useCollection<TentType>(tentsQuery);

  useEffect(() => {
    if (user && !user.isAnonymous && user.role === 'owner') {
      router.push('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    if (tents) {
      const filtered = tents.filter(tent =>
        (tent.name && tent.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (tent.beachName && tent.beachName.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredTents(filtered);
    }
  }, [searchTerm, tents, setFilteredTents]);

  if (isUserLoading || loadingTents) {
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
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Encontre seu lugar ao sol</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Busque por barracas de praia pelo nome ou pela praia em que estão.
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-lg">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Qual barraca ou praia você procura?"
                className="h-12 w-full rounded-full bg-card pl-12 pr-4 text-base shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
           <div className="mx-auto mt-12 grid max-w-lg gap-5 lg:max-w-none lg:grid-cols-3">
              {filteredTents.map((tent) => (
                <Card key={tent.id} className="flex flex-col overflow-hidden rounded-lg shadow-lg transition-transform hover:scale-105">
                   <CardHeader>
                        <CardTitle>{tent.name}</CardTitle>
                        <CardDescription>{tent.beachName}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <p className="text-sm text-muted-foreground line-clamp-3">{tent.description}</p>
                    </CardContent>
                    <div className="p-6 bg-muted/50">
                        <Button asChild className="w-full">
                            <Link href={`/tents/${tent.slug}`}>
                                Ver Cardápio e Alugar
                            </Link>
                        </Button>
                    </div>
                </Card>
              ))}
           </div>
           {tents && filteredTents.length === 0 && (
                <div className="text-center py-16">
                    <Search className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium">Nenhuma barraca encontrada</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Tente um termo de busca diferente.
                    </p>
                </div>
            )}
        </div>
      </main>
    </div>
  );
}
