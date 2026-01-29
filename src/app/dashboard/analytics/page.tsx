'use client';

import { useUser, useMemoFirebase, useFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, DollarSign, BarChart as BarChartIcon, ShoppingBag, Landmark, Copy, History, Utensils } from 'lucide-react';
import { useMemo } from 'react';
import Link from 'next/link';
import type { Reservation, Tent } from '@/lib/types';
import { collection, query, where } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { useTranslations } from '@/i18n';
import { useToast } from '@/hooks/use-toast';
import dynamic from 'next/dynamic';

const SalesChart = dynamic(
  () => import('@/components/analytics/sales-chart').then((mod) => mod.SalesChart),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[250px] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    ),
  }
);


export default function AnalyticsPage() {
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();
  const t = useTranslations('AnalyticsPage');
  const { toast } = useToast();
  const platformPixKey = 'fd9b14d6-856c-484f-aabf-4636ed73f06a';

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(platformPixKey);
    toast({
      title: t('pixKeyCopiedTitle'),
      description: t('pixKeyCopiedDescription'),
    });
  };

  const tentQuery = useMemoFirebase(
    () => (user && firestore) ? query(collection(firestore, 'tents'), where('ownerId', '==', user.uid)) : null,
    [firestore, user]
  );
  const { data: tents, isLoading: isLoadingTent } = useCollection<Tent>(tentQuery);
  const hasTent = useMemo(() => tents && tents.length > 0, [tents]);

  const reservationsQuery = useMemoFirebase(
    () => (user?.role === 'owner' && firestore) ? query(collection(firestore, 'reservations'), where('participantIds', 'array-contains', user.uid)) : null,
    [firestore, user]
  );
  const { data: reservations, isLoading: reservationsLoading } = useCollection<Reservation>(reservationsQuery);

  const completedReservationsForHistory = useMemo(() => {
    if (!reservations || !user) return [];
    return reservations
        .filter(r => r.tentOwnerId === user.uid && r.status === 'completed')
        .sort((a, b) => (b.completedAt?.toMillis() || 0) - (a.completedAt?.toMillis() || 0));
  }, [reservations, user]);

  const analyticsData = useMemo(() => {
    if (!reservations || !user) return null;
    
    const ownerReservations = reservations.filter(r => r.tentOwnerId === user.uid);

    const completedReservations = ownerReservations.filter(r => r.status === 'completed');
    
    // Include platform fees from completed reservations AND specific cancelled ones
    const feeBearingReservations = ownerReservations.filter(r => 
        r.status === 'completed' || 
        (r.status === 'cancelled' && r.cancellationReason === 'owner_late' && r.platformFee && r.platformFee > 0)
    );

    const totalRevenue = completedReservations.reduce((acc, res) => acc + res.total, 0);
    const totalPlatformFee = feeBearingReservations.reduce((acc, res) => acc + (res.platformFee || 0), 0);
    const totalReservations = completedReservations.length;
    const averageOrderValue = totalReservations > 0 ? totalRevenue / totalReservations : 0;

    return {
      totalRevenue,
      totalPlatformFee,
      totalReservations,
      averageOrderValue,
    };
  }, [reservations, user]);

  const chartData = useMemo(() => {
    if (!reservations) return [];

    const completedReservations = reservations.filter(
      (r) => r.status === 'completed' && r.completedAt
    );

    const revenueByDay = completedReservations.reduce(
      (acc, res) => {
        const date = res.completedAt!.toDate().toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + res.total;
        return acc;
      },
      {} as Record<string, number>
    );

    if (Object.keys(revenueByDay).length === 0) return [];

    return Object.entries(revenueByDay)
      .map(([date, revenue]) => ({
        date,
        revenue,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [reservations]);
  
  const productSalesData = useMemo(() => {
    if (!reservations || !user) return [];
    
    const ownerCompletedReservations = reservations.filter(
        r => r.tentOwnerId === user.uid && r.status === 'completed'
    );

    const itemMap = new Map<string, { quantity: number; revenue: number }>();

    ownerCompletedReservations.forEach(res => {
        res.items.forEach(item => {
            const existing = itemMap.get(item.name) || { quantity: 0, revenue: 0 };
            existing.quantity += item.quantity;
            existing.revenue += item.quantity * item.price;
            itemMap.set(item.name, existing);
        });
    });

    const sortedItems = Array.from(itemMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.quantity - a.quantity);
        
    return sortedItems;
}, [reservations, user]);

  if (isUserLoading || isLoadingTent) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== 'owner') {
    return <p>{t('accessDenied')}</p>;
  }

  if (hasTent === false) {
      return (
          <div className="text-center py-16 border-2 border-dashed rounded-lg max-w-lg mx-auto">
              <BarChartIcon className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">{t('noTentTitle')}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t('noTentDescription')}</p>
              <Button asChild className="mt-6">
                  <Link href="/dashboard/my-tent">{t('goToMyTent')}</Link>
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
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </header>

      {analyticsData && reservations && reservations.length > 0 ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('totalRevenue')}</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R$ {analyticsData.totalRevenue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">{t('fromReservations')} {analyticsData.totalReservations}</p>
              </CardContent>
            </Card>
            <Dialog>
              <DialogTrigger asChild>
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('amountToForward')}</CardTitle>
                    <Landmark className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-destructive">R$ {analyticsData.totalPlatformFee.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">{t('clickForInstructions')}</p>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('forwardingInstructionsTitle')}</DialogTitle>
                  <DialogDescription>
                    {t('forwardingInstructionsDescription')}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className='text-center'>
                    <p className='text-sm text-muted-foreground'>{t('totalAmountToForward')}</p>
                    <p className="text-3xl font-bold text-destructive">R$ {analyticsData.totalPlatformFee.toFixed(2)}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                    <h4 className="font-semibold">{t('pixTransferTitle')}</h4>
                     <div>
                        <p className="text-sm text-muted-foreground">{t('beneficiaryLabel')}</p>
                        <p className="font-semibold">{t('beneficiaryName')}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">{t('pixKeyLabel')}</p>
                        <div className="flex items-center gap-2">
                            <p className="font-mono text-sm break-all flex-1 p-2 bg-background rounded-md">{platformPixKey}</p>
                            <Button variant="outline" size="icon" onClick={handleCopyToClipboard}>
                                <Copy className="h-4 w-4" />
                                <span className="sr-only">Copiar Chave PIX</span>
                            </Button>
                        </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">{t('afterTransferNotice')}</p>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">{t('close')}</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('completedReservations')}</CardTitle>
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.totalReservations}</div>
                <p className="text-xs text-muted-foreground">{t('totalCompletedReservations')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('averageTicket')}</CardTitle>
                <BarChartIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R$ {analyticsData.averageOrderValue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">{t('averageValuePerReservation')}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('revenueByDay')}</CardTitle>
              <CardDescription>
                {t('revenueByDayDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {chartData && chartData.length > 0 ? (
                 <SalesChart chartData={chartData} />
              ) : (
                <div className="flex h-[250px] w-full items-center justify-center rounded-lg border-2 border-dashed text-center">
                    <p className="text-muted-foreground">{t('noChartData')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><History className="w-5 h-5"/> {t('salesHistory')}</CardTitle>
                <CardDescription>{t('salesHistoryDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
                {completedReservationsForHistory.length > 0 ? (
                    <div className="space-y-2">
                        <div className="hidden md:grid grid-cols-4 gap-4 px-4 py-2 text-sm font-medium text-muted-foreground bg-muted rounded-t-lg">
                            <div>{t('historyDate')}</div>
                            <div>{t('historyCustomer')}</div>
                            <div className="text-center">{t('historyOrder')}</div>
                            <div className="text-right">{t('historyTotal')}</div>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto pr-2 space-y-2">
                            {completedReservationsForHistory.map(res => (
                                <div key={res.id} className="rounded-lg border p-4 hover:bg-muted/50">
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 md:hidden">
                                        <div className="text-sm text-muted-foreground">Cliente</div>
                                        <div className="text-sm text-muted-foreground text-right">Valor</div>
                                        <div className="font-medium truncate">{res.userName}</div>
                                        <div className="font-bold text-right">R$ {res.total.toFixed(2)}</div>
                                        <div className="text-sm text-muted-foreground">Data</div>
                                        <div className="text-sm text-muted-foreground text-right">Pedido Nº</div>
                                        <div className="text-sm">{res.completedAt ? res.completedAt.toDate().toLocaleDateString('pt-BR') : '-'}</div>
                                        <div className="text-sm font-mono text-right">#{res.orderNumber}</div>
                                    </div>
                                    
                                    <div className="hidden md:grid grid-cols-4 gap-4 items-center">
                                        <div className="font-medium">{res.completedAt ? res.completedAt.toDate().toLocaleDateString('pt-BR') : '-'}</div>
                                        <div className="font-medium truncate">{res.userName}</div>
                                        <div className="font-mono text-center">#{res.orderNumber}</div>
                                        <div className="font-bold text-right">R$ {res.total.toFixed(2)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex h-[150px] w-full items-center justify-center rounded-lg border-2 border-dashed text-center">
                      <p className="text-muted-foreground">{t('noCompletedReservations')}</p>
                    </div>
                )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Utensils className="w-5 h-5"/> {t('productSalesAnalysisTitle')}</CardTitle>
                <CardDescription>{t('productSalesAnalysisDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
                {productSalesData.length > 0 ? (
                    <div className="space-y-2">
                        <div className="hidden md:grid grid-cols-3 gap-4 px-4 py-2 text-sm font-medium text-muted-foreground bg-muted rounded-t-lg">
                            <div>{t('itemColumn')}</div>
                            <div className="text-center">{t('quantitySoldColumn')}</div>
                            <div className="text-right">{t('revenueGeneratedColumn')}</div>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto pr-2 space-y-2">
                            {productSalesData.map(item => (
                                <div key={item.name} className="rounded-lg border p-4 hover:bg-muted/50">
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 md:hidden">
                                        <div className="col-span-2 font-medium truncate">{item.name}</div>
                                        
                                        <div className="text-sm text-muted-foreground">Qtd. Vendida</div>
                                        <div className="text-sm text-muted-foreground text-right">Receita</div>

                                        <div className="font-bold">{item.quantity}</div>
                                        <div className="font-bold text-right">R$ {item.revenue.toFixed(2)}</div>
                                    </div>
                                    
                                    <div className="hidden md:grid grid-cols-3 gap-4 items-center">
                                        <div className="font-medium truncate">{item.name}</div>
                                        <div className="font-mono text-center">{item.quantity}</div>
                                        <div className="font-bold text-right">R$ {item.revenue.toFixed(2)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex h-[150px] w-full items-center justify-center rounded-lg border-2 border-dashed text-center">
                      <p className="text-muted-foreground">{t('noItemsSold')}</p>
                    </div>
                )}
            </CardContent>
          </Card>


        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed py-16 text-center">
          <BarChartIcon className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">{t('noAnalyticsTitle')}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('noAnalyticsDescription')}
          </p>
        </div>
      )}
    </div>
  );
}
