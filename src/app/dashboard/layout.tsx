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
import { useTranslations } from '@/i18n';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('DashboardLayout');

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
        <SidebarMenuButton asChild tooltip={{ children: t('myReservations'), side: 'right' }}>
          <Link href="/dashboard/my-reservations">
            <Star />
            <span>{t('myReservations')}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={{ children: t('favorites'), side: 'right' }}>
          <Link href="/dashboard/favorites">
            <Heart />
            <span>{t('favorites')}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
       <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={{ children: t('chats'), side: 'right' }}>
          <Link href="/dashboard/chats">
            <MessageSquare />
            <span>{t('chats')}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={{ children: t('settings'), side: 'right' }}>
          <Link href="/dashboard/settings">
            <Settings />
            <span>{t('settings')}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </>
  );

  const OwnerMenu = () => (
    <>
       <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={{ children: t('reservations'), side: 'right' }}>
          <Link href="/dashboard/reservations">
            <Star />
            <span>{t('reservations')}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={{ children: t('myTent'), side: 'right' }}>
          <Link href="/dashboard/my-tent">
            <Building />
            <span>{t('myTent')}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={{ children: t('menu'), side: 'right' }}>
          <Link href="/dashboard/menu">
            <Utensils />
            <span>{t('menu')}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
       <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={{ children: t('rentals'), side: 'right' }}>
          <Link href="/dashboard/rental-items">
            <Armchair />
            <span>{t('rentals')}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
       <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={{ children: t('analytics'), side: 'right' }}>
          <Link href="/dashboard/analytics">
            <BarChart />
            <span>{t('analytics')}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
       <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={{ children: t('chats'), side: 'right' }}>
          <Link href="/dashboard/chats">
            <MessageSquare />
            <span>{t('chats')}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
       <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={{ children: t('settings'), side: 'right' }}>
          <Link href="/dashboard/settings">
            <Settings />
            <span>{t('settings')}</span>
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
              <SidebarMenuButton asChild tooltip={{ children: t('backToSite'), side: 'right' }}>
                  <Link href="/">
                    <Briefcase />
                    <span>{t('backToSite')}</span>
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
