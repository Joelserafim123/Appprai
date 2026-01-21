'use client';

import Link from 'next/link';
import { Logo } from '@/components/icons';
import Image from 'next/image';
import { authImageUrl } from '@/lib/placeholder-images';
import { useUser } from '@/firebase';
import { Loader2 } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();

  const firstName = user?.displayName?.split(' ')[0];

  return (
    <main className="min-h-screen w-full lg:grid lg:grid-cols-2">
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="mx-auto grid w-full max-w-sm gap-6">
          <Link href="/" className="mx-auto">
             <Logo userName={isUserLoading ? undefined : firstName} />
             <span className="sr-only">BeachPal Home</span>
          </Link>
          {isUserLoading && !firstName && (
            <Loader2 className="mx-auto h-6 w-6 animate-spin" />
          )}
          {children}
        </div>
      </div>
      <div className="hidden bg-muted lg:block relative">
        <Image
          src={authImageUrl}
          data-ai-hint="sunny beach"
          alt="A beautiful sunny beach"
          fill
          className="object-cover dark:brightness-[0.2] dark:grayscale"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/30 to-background/10" />
      </div>
    </main>
  );
}
