'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Home, Star, Settings, Briefcase, Building, Utensils, BarChart, LogOut, Armchair, MessageSquare, Loader2, Heart } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { useUser } from '@/firebase';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
} from '@/components/ui/sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isUserLoading) {
      return; 
    }

    if (!user || user.isAnonymous) {
      router.replace('/login');
      return;
    }
    
    if (!user.emailVerified) {
        router.replace('/verify-email-notice');
        return;
    }

    if (user.profileComplete === false && pathname !== '/dashboard/settings') {
      router.replace('/dashboard/settings');
    }
  }, [user, isUserLoading, router, pathname]);

  if (isUserLoading || !user || user.isAnonymous || !user.emailVerified || (user.profileComplete === false && pathname !== '/dashboard/settings')) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const CustomerMenu = () => (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={{ children: 'Início', side: 'right' }}>
          <Link href="/dashboard/my-reservations">
            <Star />
            <span>Minhas Reservas</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={{ children: 'Favoritos', side: 'right' }}>
          <Link href="/dashboard/favorites">
            <Heart />
            <span>Favoritos</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
       <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={{ children: 'Conversas', side: 'right' }}>
          <Link href="/dashboard/chats">
            <MessageSquare />
            <span>Conversas</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={{ children: 'Configurações', side: 'right' }}>
          <Link href="/dashboard/settings">
            <Settings />
            <span>Configurações</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </>
  );

  const OwnerMenu = () => (
    <>
       <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={{ children: 'Reservas', side: 'right' }}>
          <Link href="/dashboard/reservations">
            <Star />
            <span>Reservas</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={{ children: 'Minha Barraca', side: 'right' }}>
          <Link href="/dashboard/my-tent">
            <Building />
            <span>Minha Barraca</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={{ children: 'Cardápio', side: 'right' }}>
          <Link href="/dashboard/menu">
            <Utensils />
            <span>Cardápio</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
       <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={{ children: 'Aluguéis', side: 'right' }}>
          <Link href="/dashboard/rental-items">
            <Armchair />
            <span>Aluguéis</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
       <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={{ children: 'Análises', side: 'right' }}>
          <Link href="/dashboard/analytics">
            <BarChart />
            <span>Análises</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
       <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={{ children: 'Conversas', side: 'right' }}>
          <Link href="/dashboard/chats">
            <MessageSquare />
            <span>Conversas</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
       <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={{ children: 'Configurações', side: 'right' }}>
          <Link href="/dashboard/settings">
            <Settings />
            <span>Configurações</span>
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
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip={{ children: 'Voltar ao site', side: 'right' }}>
                  <Link href="/">
                    <Briefcase />
                    <span>Voltar ao site</span>
                  </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <Header />
        <main className="p-4 sm:p-6 md:p-8 flex-1">
            <div className="mx-auto w-full h-full">
                {children}
            </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
