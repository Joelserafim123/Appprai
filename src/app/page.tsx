'use client';

import { Header } from '@/components/layout/header';
import { BeachMap } from '@/components/beach-map';
import { Loader2 } from 'lucide-react';
import type { Tent as TentType } from '@/lib/types';
import { Logo } from '@/components/icons';
import { mockTents } from '@/lib/mock-data';
import { useState, useEffect } from 'react';

export default function HomePage() {
  const [tents, setTents] = useState<TentType[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching data to show the loading state
    const timer = setTimeout(() => {
      setTents(mockTents);
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading || !tents) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
        <Logo />
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando mapa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1 overflow-hidden">
        <BeachMap tents={tents} />
      </main>
    </div>
  );
}
