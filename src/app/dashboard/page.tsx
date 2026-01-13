
'use client';

import { useUser } from '@/firebase/provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Loader2, Star, Settings, Briefcase, Building, Utensils, BarChart, Armchair } from 'lucide-react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { user, isUserLoading: loading } = useUser();
  const router = useRouter();

  // Este conteúdo não será mais exibido, mas é mantido como fallback.
  const welcomeMessage = () => {
    const firstName = user?.displayName?.split(' ')[0] || 'usuário';
    if (user?.role === 'owner') {
      return `Olá e boas vendas, ${firstName}!`;
    }
    return `Bem-vindo de volta, ${firstName}.`;
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl">
        <header className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Painel</h1>
            <p className="text-muted-foreground">{welcomeMessage()}</p>
        </header>
    </div>
  );
}
