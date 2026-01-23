'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Logo } from '@/components/icons';
import { authImageUrl } from '@/lib/placeholder-images';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen w-full lg:grid lg:grid-cols-2">
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="mx-auto grid w-full max-w-sm gap-6">
          <Link href="/" className="mx-auto">
             <Logo />
             <span className="sr-only">BeachPal Home</span>
          </Link>
          {children}
        </div>
      </div>
      <div className="hidden bg-muted lg:block relative">
        <Image
          src={authImageUrl}
          data-ai-hint="sunny beach"
          alt="A beautiful sunny beach"
          fill
          priority
          className="object-cover dark:brightness-[0.2] dark:grayscale"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/30 to-background/10" />
      </div>
    </main>
  );
}
