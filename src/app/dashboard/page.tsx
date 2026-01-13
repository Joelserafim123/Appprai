
'use client';

import { useUser } from '@/firebase/provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Loader2, Star, Settings, Briefcase, Building, Utensils, BarChart, Armchair } from 'lucide-react';

function CustomerDashboard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Área do Cliente</CardTitle>
        <CardDescription>Gerencie suas reservas, pedidos e configurações da sua conta.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button asChild variant="outline" className="w-full justify-start text-left">
          <Link href="/dashboard/my-reservations">
            <Star className="mr-2" /> Minhas Reservas
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full justify-start text-left">
          <Link href="/dashboard/settings">
            <Settings className="mr-2" /> Configurações da Conta
          </Link>
        </Button>
        <Button asChild className="w-full mt-4">
            <Link href="/">Encontrar uma Barraca</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function OwnerDashboard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Área do Dono de Barraca</CardTitle>
        <CardDescription>Gerencie sua barraca, cardápio, reservas e veja suas vendas.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button asChild variant="outline" className="w-full justify-start text-left">
          <Link href="/dashboard/my-tent">
            <Building className="mr-2" /> Gerenciar Minha Barraca
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full justify-start text-left">
          <Link href="/dashboard/menu">
            <Utensils className="mr-2" /> Atualizar Cardápio
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full justify-start text-left">
          <Link href="/dashboard/rental-items">
            <Armchair className="mr-2" /> Gerenciar Itens de Aluguel
          </Link>
        </Button>
         <Button asChild variant="outline" className="w-full justify-start text-left">
          <Link href="/dashboard/reservations">
            <Star className="mr-2" /> Ver Reservas
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full justify-start text-left">
          <Link href="/dashboard/analytics">
            <BarChart className="mr-2" /> Análise de Vendas
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user, isUserLoading: loading } = useUser();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const welcomeMessage = () => {
    const firstName = user?.displayName?.split(' ')[0] || 'usuário';
    if (user?.role === 'owner') {
      return `Olá de boas vendas, ${firstName}!`;
    }
    return `Bem-vindo(a) de volta, ${firstName}.`;
  };

  return (
    <div className="w-full max-w-2xl">
        <header className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Painel</h1>
            <p className="text-muted-foreground">{welcomeMessage()}</p>
        </header>
        {user?.role === 'owner' ? <OwnerDashboard /> : <CustomerDashboard />}
    </div>
  );
}
