'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function ConfirmVerificationPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
