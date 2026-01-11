'use client';

import { useUser } from '@/firebase/auth/use-user';
import { useFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, where, Timestamp, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, DollarSign, BarChart, ShoppingBag } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import {
  Bar,
  BarChart as RechartsBarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { ChartTooltipContent, ChartContainer, ChartConfig } from '@/components/ui/chart';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Reservation = {
  id: string;
  total: number;
  createdAt: Timestamp;
  status: 'confirmed' | 'cancelled' | 'completed';
};

const chartConfig = {
  receita: {
    label: 'Receita',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

export default function AnalyticsPage() {
  const { user, loading: userLoading } = useUser();
  const { db } = useFirebase();
  const [tentId, setTentId] = useState<string | null>(null);

  useEffect(() => {
    if (db && user) {
      const getTentId = async () => {
        const tentsRef = collection(db, 'tents');
        const q = query(tentsRef, where('ownerId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setTentId(querySnapshot.docs[0].id);
        }
      };
      getTentId();
    }
  }, [db, user]);

  const reservationsQuery = useMemo(() => {
    if (!db || !tentId) return null;
    return query(collection(db, 'reservations'), where('tentId', '==', tentId));
  }, [db, tentId]);

  const { data: reservations, loading: reservationsLoading, error } = useCollection<Reservation>(reservationsQuery);

  const analyticsData = useMemo(() => {
    if (!reservations) return null;

    const completedReservations = reservations.filter(r => r.status === 'completed');

    const totalRevenue = completedReservations.reduce((acc, res) => acc + res.total, 0);
    const totalReservations = completedReservations.length;
    const averageOrderValue = totalReservations > 0 ? totalRevenue / totalReservations : 0;

    const dailyRevenue = completedReservations.reduce((acc, res) => {
      const date = format(res.createdAt.toDate(), 'dd/MM/yyyy');
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date] += res.total;
      return acc;
    }, {} as Record<string, number>);

    const chartData = Object.entries(dailyRevenue)
      .map(([date, receita]) => ({ date, receita }))
      .sort((a, b) => new Date(a.date.split('/').reverse().join('-')).getTime() - new Date(b.date.split('/').reverse().join('-')).getTime());


    return {
      totalRevenue,
      totalReservations,
      averageOrderValue,
      chartData,
    };
  }, [reservations]);

  if (userLoading || reservationsLoading || (user && !tentId && !reservations)) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== 'owner') {
    return <p>Acesso negado. Esta página é apenas para donos de barracas.</p>;
  }

  if (error) {
    return <p className="text-destructive">Erro ao carregar análises: {error.message}</p>;
  }

  return (
    <div className="w-full max-w-6xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Análise de Vendas</h1>
        <p className="text-muted-foreground">Veja o desempenho da sua barraca.</p>
      </header>

      {analyticsData ? (
        <div className="space-y-8">
          <div className="grid gap-4 md:grid-cols-3">
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

          <Card>
            <CardHeader>
              <CardTitle>Receita por Dia</CardTitle>
              <CardDescription>
                Acompanhe a evolução das suas vendas diárias. Apenas reservas com status "Completa" são contabilizadas.
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
                             tickFormatter={(value) => format(new Date(value.split('/').reverse().join('-')), 'dd/MM')}
                        />
                        <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `R$ ${value}`} />
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent indicator="dot" />}
                        />
                        <Bar dataKey="receita" fill="var(--color-receita)" radius={4} />
                        </RechartsBarChart>
                    </ChartContainer>
                ) : (
                    <div className="flex h-[250px] w-full items-center justify-center text-center">
                        <p className="text-muted-foreground">Nenhum dado de receita para exibir no gráfico ainda.</p>
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
            Complete algumas reservas para começar a ver suas análises de vendas.
          </p>
        </div>
      )}
    </div>
  );
}
