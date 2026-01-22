'use client';

import { useUser } from '@/firebase/provider';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isUserLoading) return;
    
    if (!user) {
        router.replace('/login');
        return;
    }

    if(user.isAnonymous) {
      router.replace('/login');
      return;
    }

    if (user.role === 'owner') {
      router.replace('/dashboard/reservations');
    } else {
      router.replace('/dashboard/my-reservations');
    }
    
  }, [user, isUserLoading, router]);

  return (
    <div className="flex h-full w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
