'use client';

import { useUser, useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, documentId } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Heart, Tent as TentIcon } from 'lucide-react';
import Link from 'next/link';
import type { Tent } from '@/lib/types';

export default function FavoritesPage() {
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();

  const favoriteTentsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.favoriteTentIds || user.favoriteTentIds.length === 0) {
      return null;
    }
    // Firestore 'in' queries are limited to 30 elements.
    // For this app, we'll assume a user won't have more than 30 favorites.
    // For a production app with more scale, this would need pagination or a different data model.
    return query(collection(firestore, 'tents'), where(documentId(), 'in', user.favoriteTentIds.slice(0, 30)));
  }, [firestore, user?.favoriteTentIds]);

  const { data: favoriteTents, isLoading: loadingFavorites } = useCollection<Tent>(favoriteTentsQuery);

  if (isUserLoading || (loadingFavorites && !favoriteTents)) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== 'customer') {
    return <p>Acesso negado. Esta página é apenas para clientes.</p>;
  }

  return (
    <div className="w-full max-w-4xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Minhas Barracas Favoritas</h1>
        <p className="text-muted-foreground">Acesse rapidamente as barracas que você mais gosta.</p>
      </header>

      {favoriteTents && favoriteTents.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {favoriteTents.map((tent) => (
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
                  <Link href={`/tents/${tent.id}`}>
                    Ver Cardápio e Alugar
                  </Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <Heart className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">Nenhuma barraca favorita</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Clique no ícone de coração na página de uma barraca para adicioná-la aqui.
          </p>
          <Button asChild className="mt-6">
            <Link href="/">Encontrar uma barraca</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
