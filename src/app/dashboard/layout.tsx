
'use client';

import { Header } from '@/components/layout/header';
import { useUser } from '@/firebase/provider';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Home, Star, Settings, Briefcase, Building, Utensils, BarChart, LogOut, Armchair, MessageSquare, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && user && !user.emailVerified) {
      router.push('/verify-email');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (user && !user.emailVerified) {
    // This will be briefly visible while the redirect happens
    return (
       <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const CustomerMenu = () => (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={{ children: 'Home', side: 'right' }}>
          <Link href="/dashboard">
            <Home />
            <span>Home</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={{ children: 'My Reservations', side: 'right' }}>
          <Link href="/dashboard/my-reservations">
            <Star />
            <span>My Reservations</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={{ children: 'Chats', side: 'right' }}>
          <Link href="/dashboard/chats">
            <MessageSquare />
            <span>Chats</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={{ children: 'Settings', side: 'right' }}>
          <Link href="/dashboard/settings">
            <Settings />
            <span>Settings</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </>
  );

  const OwnerMenu = () => (
    <>
       <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={{ children: 'Home', side: 'right' }}>
          <Link href="/dashboard">
            <Home />
            <span>Home</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={{ children: 'My Tent', side: 'right' }}>
          <Link href="/dashboard/my-tent">
            <Building />
            <span>My Tent</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={{ children: 'Menu', side: 'right' }}>
          <Link href="/dashboard/menu">
            <Utensils />
            <span>Menu</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
       <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={{ children: 'Rentals', side: 'right' }}>
          <Link href="/dashboard/rental-items">
            <Armchair />
            <span>Rentals</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
       <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={{ children: 'Reservations', side: 'right' }}>
          <Link href="/dashboard/reservations">
            <Star />
            <span>Reservations</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={{ children: 'Chats', side: 'right' }}>
          <Link href="/dashboard/chats">
            <MessageSquare />
            <span>Chats</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
       <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={{ children: 'Analytics', side: 'right' }}>
          <Link href="/dashboard/analytics">
            <BarChart />
            <span>Analytics</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </>
  );

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader />
        <SidebarContent>
          <SidebarMenu>
            {user?.role === 'owner' ? <OwnerMenu /> : <CustomerMenu />}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
           <SidebarMenu>
               <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip={{ children: 'Back to site', side: 'right' }}>
                         <Link href="/">
                            <Briefcase />
                            <span>Back to site</span>
                         </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
           </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <Header />
        <main className="p-4 sm:p-6 md:p-8 flex-1">
            <div className="mx-auto w-full h-full flex items-center justify-center">
                {children}
            </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
