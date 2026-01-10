'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons';
import { UserCircle2, LogOut } from 'lucide-react';
import { useUser } from '@/firebase/auth/use-user';
import { getAuth, signOut } from 'firebase/auth';
import { useFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export function Header() {
  const { user } = useUser();
  const { app } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();

  const handleLogout = async () => {
    if (!app) return;
    const auth = getAuth(app);
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
        <nav className="flex items-center space-x-2">
          {user ? (
            <>
              <Button asChild variant="ghost" size="icon">
                <Link href="/dashboard">
                  <UserCircle2 className="h-5 w-5" />
                  <span className="sr-only">Painel</span>
                </Link>
              </Button>
              <Button onClick={handleLogout} variant="ghost" size="sm">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
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
