
'use client';

import { useUser } from '@/firebase/provider';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isUserLoading) {
      // Aguarde até que as informações do usuário estejam disponíveis
      return;
    }

    if (user) {
      // Redireciona com base na função do usuário
      if (user.role === 'owner') {
        router.push('/dashboard/reservations');
      } else {
        router.push('/dashboard/my-reservations');
      }
    } else {
        // Se por algum motivo não houver usuário, volta para o login
        router.push('/login');
    }
  }, [user, isUserLoading, router]);


  // Exibe um loader em tela cheia enquanto o redirecionamento está acontecendo
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
