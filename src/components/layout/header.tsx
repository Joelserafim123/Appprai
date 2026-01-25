'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons';
import { LogOut, LayoutGrid, Settings, Star, Building, Utensils, BarChart, Armchair, List, MessageSquare, User as UserIcon, Heart } from 'lucide-react';
import { useUser, useFirebase } from '@/firebase';
import { getAuth, signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { LanguageSwitcher } from '../language-switcher';
import { useTranslations } from '@/i18n';


export function Header() {
  const { user } = useUser();
  const { firebaseApp } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const t = useTranslations('Header');

  const handleLogout = async () => {
    if (!firebaseApp) return;
    const auth = getAuth(firebaseApp);
    try {
      await signOut(auth);
      toast({
        title: t('logoutSuccessTitle'),
        description: t('logoutSuccessDescription'),
      });
      router.push('/');
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        variant: 'destructive',
        title: t('logoutErrorTitle'),
        description: t('logoutErrorDescription'),
      });
    }
  };
  
  const CustomerMenuItems = () => (
    <>
      <DropdownMenuItem asChild>
        <Link href="/dashboard">
          <LayoutGrid className="mr-2 h-4 w-4" />
          <span>{t('dashboard')}</span>
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/dashboard/my-reservations">
          <Star className="mr-2 h-4 w-4" />
          <span>{t('myReservations')}</span>
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/dashboard/favorites">
            <Heart className="mr-2 h-4 w-4" />
            <span>{t('favorites')}</span>
        </Link>
      </DropdownMenuItem>
       <DropdownMenuItem asChild>
        <Link href="/dashboard/settings">
            <Settings className="mr-2 h-4 w-4" />
            <span>{t('settings')}</span>
        </Link>
      </DropdownMenuItem>
    </>
  );

  const OwnerMenuItems = () => (
     <>
      <DropdownMenuItem asChild>
        <Link href="/dashboard/reservations">
          <Star className="mr-2 h-4 w-4" />
          <span>{t('reservations')}</span>
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/dashboard/my-tent">
          <Building className="mr-2 h-4 w-4" />
          <span>{t('myTent')}</span>
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/dashboard/menu">
          <Utensils className="mr-2 h-4 w-4" />
          <span>{t('menu')}</span>
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/dashboard/rental-items">
          <Armchair className="mr-2 h-4 w-4" />
          <span>{t('rentals')}</span>
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/dashboard/analytics">
          <BarChart className="mr-2 h-4 w-4" />
          <span>{t('analytics')}</span>
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/dashboard/chats">
          <MessageSquare className="mr-2 h-4 w-4" />
          <span>{t('chats')}</span>
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/dashboard/settings">
          <Settings className="mr-2 h-4 w-4" />
          <span>{t('settings')}</span>
        </Link>
      </DropdownMenuItem>
    </>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-7xl items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <Logo />
        </Link>
        <nav className="flex items-center space-x-2 sm:space-x-4">
           <Button asChild variant="outline">
                <Link href="/list">
                    <List className="mr-2 h-4 w-4"/>
                    <span>{t('viewTents')}</span>
                </Link>
            </Button>
          {user && !user.isAnonymous ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex h-auto items-center gap-2 rounded-full p-1 pr-3">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={user.photoURL ?? undefined} alt={user.displayName ?? ''} />
                        <AvatarFallback className="bg-primary/20 text-primary">
                            <UserIcon className="h-5 w-5" />
                        </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{t('greeting')} {user.displayName?.split(' ')[0]}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.displayName}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {user.role === 'owner' ? <OwnerMenuItems /> : <CustomerMenuItems />}
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{t('logout')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link href="/login">{t('login')}</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">{t('signUp')}</Link>
              </Button>
            </>
          )}
          <LanguageSwitcher />
        </nav>
      </div>
    </header>
  );
}
