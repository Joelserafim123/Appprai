
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons';
import { LogOut, LayoutGrid, Menu, User } from 'lucide-react';
import { useUser } from '@/firebase/provider';
import { getAuth, signOut } from 'firebase/auth';
import { useFirebase } from '@/firebase/provider';
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
import { getInitials } from '@/lib/utils';


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
        title: 'Logout realizado',
        description: 'Você foi desconectado com sucesso.',
      });
      router.push('/');
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        variant: 'destructive',
        title: 'Erro no Logout',
        description: 'Não foi possível fazer o logout. Tente novamente.',
      });
    }
  };
  
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-7xl items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <Logo />
        </Link>
        <nav className="flex items-center space-x-4">
          {user ? (
            <>
              <span className="font-medium text-sm hidden sm:inline">
                Olá, {user.displayName?.split(' ')[0]}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8">
                     <Avatar className="h-8 w-8">
                        <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? ''} />
                        <AvatarFallback>
                            <User className="h-4 w-4" />
                        </AvatarFallback>
                    </Avatar>
                    <span className="sr-only">Abrir menu do usuário</span>
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
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard">
                        <LayoutGrid className="mr-2 h-4 w-4" />
                        <span>Painel</span>
                    </Link>
                  </DropdownMenuItem>
                   <DropdownMenuItem asChild>
                     <Link href="/dashboard/settings">
                        <LayoutGrid className="mr-2 h-4 w-4" />
                        <span>Editar Perfil</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link href="/login">Entrar</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Inscrever-se</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
