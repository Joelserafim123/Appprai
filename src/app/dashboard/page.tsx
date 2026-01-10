'use client';

import { useUser } from '@/firebase/auth/use-user';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Loader2, Star, Settings, Briefcase, Building, Utensils, BarChart } from 'lucide-react';

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
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl">
        <header className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Painel</h1>
            <p className="text-muted-foreground">Bem-vindo(a) de volta, {user?.displayName || 'usuário'}.</p>
        </header>
        {user?.role === 'owner' ? <OwnerDashboard /> : <CustomerDashboard />}
    </div>
  );
}
