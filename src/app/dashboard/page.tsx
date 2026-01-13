
'use client';

import { useUser } from '@/firebase/provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Loader2, Star, Building } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  if (isUserLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
        <div className="text-center">
            <p className="text-lg">Você não está logado.</p>
            <Button asChild className="mt-4">
                <Link href="/login">Ir para o Login</Link>
            </Button>
        </div>
    );
  }
  
  if (user.role === 'owner') {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <CardTitle>Bem-vindo(a), {user.displayName?.split(' ')[0]}!</CardTitle>
            <CardDescription>Gerencie sua barraca, veja suas reservas e acompanhe seu negócio.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
                <Link href="/dashboard/reservations">
                    <Star className="mr-2 h-4 w-4" />
                    Ver Reservas
                </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
                <Link href="/dashboard/my-tent">
                    <Building className="mr-2 h-4 w-4" />
                    Gerenciar Barraca
                </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  // This will be shown for customers
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Bem-vindo(a) ao BeachPal!</CardTitle>
          <CardDescription>Gerencie suas reservas e aproveite a praia.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Use o menu ao lado para navegar, ver suas reservas ou encontrar novas barracas.</p>
        </CardContent>
        <CardFooter>
          <Button asChild>
              <Link href="/dashboard/my-reservations">Ver Minhas Reservas</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
