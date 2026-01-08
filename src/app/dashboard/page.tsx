import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/layout/header';
import { User, Briefcase, Settings, Star } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 p-4 sm:p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <header className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Manage your BeachPal experience.</p>
          </header>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-lg text-primary">
                        <User className="h-6 w-6" />
                    </div>
                    <div>
                        <CardTitle>Customer View</CardTitle>
                        <CardDescription>Manage your reservations and orders.</CardDescription>
                    </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start gap-2">
                    <Star className="w-4 h-4"/> My Reservations
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2">
                    <Settings className="w-4 h-4"/> Account Settings
                </Button>
                 <Button asChild className="w-full mt-4">
                  <Link href="/">Find a Tent</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                     <div className="p-3 bg-accent/10 rounded-lg text-accent">
                        <Briefcase className="h-6 w-6" />
                    </div>
                    <div>
                        <CardTitle>Tent Owner View</CardTitle>
                        <CardDescription>Manage your tent, menu, and orders.</CardDescription>
                    </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start gap-2">
                    Manage My Tent
                </Button>
                 <Button variant="outline" className="w-full justify-start gap-2">
                    Update Menu
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2">
                    View Orders
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
