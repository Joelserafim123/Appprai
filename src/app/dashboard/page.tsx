
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
        <CardTitle>Customer Area</CardTitle>
        <CardDescription>Manage your reservations, orders, and account settings.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button asChild variant="outline" className="w-full justify-start text-left">
          <Link href="/dashboard/my-reservations">
            <Star className="mr-2" /> My Reservations
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full justify-start text-left">
          <Link href="/dashboard/settings">
            <Settings className="mr-2" /> Account Settings
          </Link>
        </Button>
        <Button asChild className="w-full mt-4">
            <Link href="/">Find a Tent</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function OwnerDashboard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tent Owner Area</CardTitle>
        <CardDescription>Manage your tent, menu, reservations, and view your sales.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button asChild variant="outline" className="w-full justify-start text-left">
          <Link href="/dashboard/my-tent">
            <Building className="mr-2" /> Manage My Tent
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full justify-start text-left">
          <Link href="/dashboard/menu">
            <Utensils className="mr-2" /> Update Menu
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full justify-start text-left">
          <Link href="/dashboard/rental-items">
            <Armchair className="mr-2" /> Manage Rental Items
          </Link>
        </Button>
         <Button asChild variant="outline" className="w-full justify-start text-left">
          <Link href="/dashboard/reservations">
            <Star className="mr-2" /> View Reservations
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full justify-start text-left">
          <Link href="/dashboard/analytics">
            <BarChart className="mr-2" /> Sales Analytics
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
    const firstName = user?.displayName?.split(' ')[0] || 'user';
    if (user?.role === 'owner') {
      return `Hello and happy sales, ${firstName}!`;
    }
    return `Welcome back, ${firstName}.`;
  };

  return (
    <div className="w-full max-w-2xl">
        <header className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">{welcomeMessage()}</p>
        </header>
        {user?.role === 'owner' ? <OwnerDashboard /> : <CustomerDashboard />}
    </div>
  );
}
