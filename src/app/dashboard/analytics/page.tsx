'use client';

import { useUser, useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, DollarSign, BarChart, ShoppingBag, Landmark } from 'lucide-react';
import { useMemo } from 'react';
import {
  Bar,
  BarChart as RechartsBarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { ChartTooltipContent, ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import type { Reservation, Tent } from '@/lib/types';
import { collection, query, where } from 'firebase/firestore';


const chartConfig = {
  revenue: {
    label: 'Receita',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

export default function AnalyticsPage() {
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();
  
  const tentQuery = useMemoFirebase(
    () => (user && firestore) ? query(collection(firestore, 'tents'), where('ownerId', '==', user.uid)) : null,
    [firestore, user]
  );
  const { data: tents, isLoading: isLoadingTent } = useCollection<Tent>(tentQuery);
  const hasTent = useMemo(() => tents && tents.length > 0, [tents]);

  const reservationsQuery = useMemoFirebase(
    () => (user && firestore) ? query(collection(firestore, 'reservations'), where('tentOwnerId', '==', user.uid)) : null,
    [firestore, user]
  );
  const { data: reservations, isLoading: reservationsLoading } = useCollection<Reservation>(reservationsQuery);


  const analyticsData = useMemo(() => {
    if (!reservations || !user) return null;

    const completedReservations = reservations.filter(r => r.status === 'completed');
    
    // Include platform fees from completed reservations AND specific cancelled ones
    const feeBearingReservations = reservations.filter(r => 
        r.status === 'completed' || 
        (r.status === 'cancelled' && r.cancellationReason === 'owner_late' && r.platformFee && r.platformFee > 0)
    );

    const totalRevenue = completedReservations.reduce((acc, res) => acc + res.total, 0);
    const totalPlatformFee = feeBearingReservations.reduce((acc, res) => acc + (res.platformFee || 0), 0);
    const totalReservations = completedReservations.length;
    const averageOrderValue = totalReservations > 0 ? totalRevenue / totalReservations : 0;

    const dailyRevenue = completedReservations.reduce((acc, res) => {
      if (res.createdAt && typeof res.createdAt.toDate === 'function') {
        const date = format(res.createdAt.toDate(), 'yyyy-MM-dd');
        if (!acc[date]) {
          acc[date] = 0;
        }
        acc[date] += res.total;
      }
      return acc;
    }, {} as Record<string, number>);

    const chartData = Object.entries(dailyRevenue)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());


    return {
      totalRevenue,
      totalPlatformFee,
      totalReservations,
      averageOrderValue,
      chartData,
    };
  }, [reservations, user]);


  if (isUserLoading || isLoadingTent) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== 'owner') {
    return <p>Acesso negado. Esta página é apenas para donos de barracas.</p>;
  }

  if (hasTent === false) {
      return (
          <div className="text-center py-16 border-2 border-dashed rounded-lg max-w-lg mx-auto">
              <BarChart className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">Cadastre sua barraca primeiro</h3>
              <p className="mt-2 text-sm text-muted-foreground">Você precisa ter uma barraca para ver suas análises.</p>
              <Button asChild className="mt-6">
                  <Link href="/dashboard/my-tent">Ir para Minha Barraca</Link>
              </Button>
          </div>
      )
  }
  
  if (reservationsLoading) {
     return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Análise de Vendas</h1>
        <p className="text-muted-foreground">Veja o desempenho da sua barraca.</p>
      </header>

      {analyticsData && reservations && reservations.length > 0 ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R$ {analyticsData.totalRevenue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">de {analyticsData.totalReservations} reservas completas</p>
              </CardContent>
            </Card>
             <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Valor a Repassar</CardTitle>
                <Landmark className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">R$ {analyticsData.totalPlatformFee.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">Comissões da plataforma</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Reservas Completas</CardTitle>
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.totalReservations}</div>
                <p className="text-xs text-muted-foreground">Total de reservas finalizadas</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
                <BarChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R$ {analyticsData.averageOrderValue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">Valor médio por reserva</p>
              </CardContent>
            </Card>
          </div>
          
          <Card className="bg-muted/50">
            <CardHeader>
                <CardTitle>Entenda a Comissão da Plataforma</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm ">
                    A plataforma retém uma comissão de <strong>10% sobre o valor total</strong> de cada reserva finalizada, com um valor <strong>mínimo de R$ 3,00</strong> por transação. Taxas de cancelamento tardio por parte do barraqueiro também são somadas aqui. O montante acumulado, apresentado como "Valor a Repassar", deve ser transferido para a plataforma toda segunda-feira via depósito ou PIX.
                </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Receita por Dia</CardTitle>
              <CardDescription>
                Acompanhe a evolução de suas vendas diárias. Apenas reservas com status "Completa" são contabilizadas.
              </CardDescription>
            </CardHeader>
            <CardContent>
                {analyticsData.chartData.length > 0 ? (
                    <ChartContainer config={chartConfig} className="aspect-video h-[250px] w-full">
                        <RechartsBarChart accessibilityLayer data={analyticsData.chartData}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                             tickFormatter={(value) => {
                                const date = new Date(`${value}T00:00:00`);
                                if (isValid(date)) {
                                  return format(date, 'dd/MM', { locale: ptBR });
                                }
                                return '';
                              }}
                        />
                        <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value}`} />
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent indicator="dot" />}
                        />
                        <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
                        </RechartsBarChart>
                    </ChartContainer>
                ) : (
                    <div className="flex h-[250px] w-full items-center justify-center text-center">
                        <p className="text-muted-foreground">Ainda não há dados de receita para exibir no gráfico.</p>
                    </div>
                )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed py-16 text-center">
          <BarChart className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">Nenhuma análise para mostrar</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Conclua algumas reservas para começar a ver suas análises de vendas.
          </p>
        </div>
      )}
    </div>
  );
}
