
'use client';

import { useUser } from '@/firebase/provider';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // Apenas executa a lógica se o carregamento do usuário estiver concluído
    if (!isUserLoading && user) {
      if (user.role === 'owner') {
        router.replace('/dashboard/reservations');
      } else {
        router.replace('/dashboard/my-reservations');
      }
    }
    // Adiciona dependência em router para garantir que ele esteja disponível.
  }, [user, isUserLoading, router]);

  // Exibe um indicador de carregamento em tela cheia enquanto espera o usuário ou o redirecionamento.
  // Isso evita mostrar qualquer conteúdo da página antiga e garante uma transição suave.
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
