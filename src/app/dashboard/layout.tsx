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
import { Home, Star, Settings, Briefcase, Building, Utensils, BarChart, LogOut, Armchair, MessageSquare } from 'lucide-react';
import Link from 'next/link';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useUser();

  const CustomerMenu = () => (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={{ children: 'Início', side: 'right' }}>
          <Link href="/dashboard">
            <Home />
            <span>Início</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={{ children: 'Minhas Reservas', side: 'right' }}>
          <Link href="/dashboard/my-reservations">
            <Star />
            <span>Minhas Reservas</span>
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
        <SidebarMenuButton asChild tooltip={{ children: 'Início', side: 'right' }}>
          <Link href="/dashboard">
            <Home />
            <span>Início</span>
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
        <SidebarMenuButton asChild tooltip={{ children: 'Reservas', side: 'right' }}>
          <Link href="/dashboard/reservations">
            <Star />
            <span>Reservas</span>
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
                    <SidebarMenuButton asChild tooltip={{ children: 'Voltar ao site', side: 'right' }}>
                         <Link href="/">
                            <Briefcase />
                            <span>Voltar ao site</span>
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
