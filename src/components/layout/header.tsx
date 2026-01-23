'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons';
import { LogOut, LayoutGrid, Settings, Star, Building, Utensils, BarChart, Armchair, List, MessageSquare, User as UserIcon } from 'lucide-react';
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


export function Header() {
  const { user } = useUser();
  const { firebaseApp } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();

  const handleLogout = async () => {
    if (!firebaseApp) return;
    const auth = getAuth(firebaseApp);
    try {
      await signOut(auth);
      toast({
        title: 'Logout bem-sucedido',
        description: 'Você foi desconectado com sucesso.',
      });
      router.push('/');
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        variant: 'destructive',
        title: 'Erro no Logout',
        description: 'Não foi possível desconectá-lo. Por favor, tente novamente.',
      });
    }
  };
  
  const CustomerMenuItems = () => (
    <>
      <DropdownMenuItem asChild>
        <Link href="/dashboard">
          <LayoutGrid className="mr-2 h-4 w-4" />
          <span>Painel</span>
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/dashboard/my-reservations">
          <Star className="mr-2 h-4 w-4" />
          <span>Minhas Reservas</span>
        </Link>
      </DropdownMenuItem>
       <DropdownMenuItem asChild>
        <Link href="/dashboard/settings">
            <Settings className="mr-2 h-4 w-4" />
            <span>Configurações</span>
        </Link>
      </DropdownMenuItem>
    </>
  );

  const OwnerMenuItems = () => (
     <>
      <DropdownMenuItem asChild>
        <Link href="/dashboard/reservations">
          <Star className="mr-2 h-4 w-4" />
          <span>Reservas</span>
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/dashboard/my-tent">
          <Building className="mr-2 h-4 w-4" />
          <span>Minha Barraca</span>
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/dashboard/menu">
          <Utensils className="mr-2 h-4 w-4" />
          <span>Cardápio</span>
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/dashboard/rental-items">
          <Armchair className="mr-2 h-4 w-4" />
          <span>Aluguéis</span>
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/dashboard/analytics">
          <BarChart className="mr-2 h-4 w-4" />
          <span>Análises</span>
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/dashboard/chats">
          <MessageSquare className="mr-2 h-4 w-4" />
          <span>Conversas</span>
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/dashboard/settings">
          <Settings className="mr-2 h-4 w-4" />
          <span>Configurações</span>
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
        <nav className="flex items-center space-x-2">
           <Button asChild variant="outline">
                <Link href="/list">
                    <List className="mr-2 h-4 w-4"/>
                    <span>Ver Barracas</span>
                </Link>
            </Button>
          {user && !user.isAnonymous ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-auto p-1 pr-3">
                  <Avatar className="h-7 w-7">
                      <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? ''} />
                      <AvatarFallback>
                          <UserIcon className="h-4 w-4" />
                      </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline font-medium">{user.displayName?.split(' ')[0]}</span>
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
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link href="/login">Entrar</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Cadastrar</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
