'use client';

import { useUser } from '@/firebase/provider';
import { useFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, where, Timestamp, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { enUS } from 'date-fns/locale';
import Link from 'next/link';
import { useMemoFirebase } from '@/firebase/provider';

type Reservation = {
  id: string;
  total: number;
  createdAt: Timestamp;
  status: 'confirmed' | 'cancelled' | 'completed';
};

const chartConfig = {
  revenue: {
    label: 'Revenue',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

export default function AnalyticsPage() {
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();
  const [tentId, setTentId] = useState<string | null>(null);
  const [loadingTent, setLoadingTent] = useState(true);

  useEffect(() => {
    if (isUserLoading) {
        setLoadingTent(true);
        return;
    };
    if (firestore && user && user.role === 'owner') {
      setLoadingTent(true);
      const getTentId = async () => {
        const tentsRef = collection(firestore, 'tents');
        const q = query(tentsRef, where('ownerId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setTentId(querySnapshot.docs[0].id);
        }
        setLoadingTent(false);
      };
      getTentId();
    } else {
      setLoadingTent(false);
    }
  }, [firestore, user, isUserLoading]);

  const reservationsQuery = useMemoFirebase(() => {
    if (!firestore || !tentId) return null;
    return query(collection(firestore, 'reservations'), where('tentId', '==', tentId));
  }, [firestore, tentId]);

  const { data: reservations, isLoading: reservationsLoading, error } = useCollection<Reservation>(reservationsQuery);

  const analyticsData = useMemo(() => {
    if (!reservations) return null;

    const completedReservations = reservations.filter(r => r.status === 'completed');

    const totalRevenue = completedReservations.reduce((acc, res) => acc + res.total, 0);
    const totalReservations = completedReservations.length;
    const averageOrderValue = totalReservations > 0 ? totalRevenue / totalReservations : 0;

    const dailyRevenue = completedReservations.reduce((acc, res) => {
      const date = format(res.createdAt.toDate(), 'yyyy-MM-dd');
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date] += res.total;
      return acc;
    }, {} as Record<string, number>);

    const chartData = Object.entries(dailyRevenue)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());


    return {
      totalRevenue,
      totalReservations,
      averageOrderValue,
      chartData,
    };
  }, [reservations]);

  if (isUserLoading || loadingTent) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== 'owner') {
    return <p>Access denied. This page is for tent owners only.</p>;
  }

  if (!tentId && !loadingTent) {
      return (
          <div className="text-center py-16 border-2 border-dashed rounded-lg max-w-lg mx-auto">
              <BarChart className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">Register your tent first</h3>
              <p className="mt-2 text-sm text-muted-foreground">You need to have a tent to see your analytics.</p>
              <Button asChild className="mt-6">
                  <Link href="/dashboard/my-tent">Go to My Tent</Link>
              </Button>
          </div>
      )
  }

  if (error) {
    return <p className="text-destructive">Error loading analytics: {error.message}</p>;
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
        <h1 className="text-3xl font-bold tracking-tight">Sales Analytics</h1>
        <p className="text-muted-foreground">See how your tent is performing.</p>
      </header>

      {analyticsData && reservations ? (
        <div className="space-y-8">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$ {analyticsData.totalRevenue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">from {analyticsData.totalReservations} completed reservations</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed Reservations</CardTitle>
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.totalReservations}</div>
                <p className="text-xs text-muted-foreground">Total finalized reservations</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Ticket</CardTitle>
                <BarChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$ {analyticsData.averageOrderValue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">Average value per reservation</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Revenue by Day</CardTitle>
              <CardDescription>
                Track the evolution of your daily sales. Only reservations with "Completed" status are counted.
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
                             tickFormatter={(value) => format(new Date(value), 'MM/dd', { locale: enUS })}
                        />
                        <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent indicator="dot" />}
                        />
                        <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
                        </RechartsBarChart>
                    </ChartContainer>
                ) : (
                    <div className="flex h-[250px] w-full items-center justify-center text-center">
                        <p className="text-muted-foreground">No revenue data to display in the chart yet.</p>
                    </div>
                )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed py-16 text-center">
          <BarChart className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No analytics to show</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Complete some reservations to start seeing your sales analytics.
          </p>
        </div>
      )}
    </div>
  );
}
