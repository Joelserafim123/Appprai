
'use client';

import { useUser } from '@/firebase/provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();

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

  const CustomerWelcome = () => (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Bem-vindo(a) ao BeachPal!</CardTitle>
        <CardDescription>Gerencie suas reservas e aproveite a praia.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Use o menu ao lado para navegar, ver suas reservas ou encontrar novas barracas.</p>
      </CardContent>
      <CardContent>
         <Button asChild>
            <Link href="/dashboard/my-reservations">Ver Minhas Reservas</Link>
        </Button>
      </CardContent>
    </Card>
  );

  const OwnerWelcome = () => (
     <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Bem-vindo(a), Dono(a) de Barraca!</CardTitle>
        <CardDescription>Gerencie seu negócio na praia com facilidade.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Use o menu ao lado para ver suas reservas, gerenciar seu cardápio e analisar suas vendas.</p>
      </CardContent>
       <CardContent>
         <Button asChild>
            <Link href="/dashboard/reservations">Ver Reservas</Link>
        </Button>
      </CardContent>
    </Card>
  );


  return (
    <div className="flex h-full w-full items-center justify-center">
      {user.role === 'owner' ? <OwnerWelcome /> : <CustomerWelcome />}
    </div>
  );
}
