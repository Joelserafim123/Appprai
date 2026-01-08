import Link from 'next/link';
import { Logo } from '@/components/icons';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen w-full lg:grid lg:grid-cols-2">
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="mx-auto grid w-[350px] gap-6">
          <Link href="/" className="mx-auto">
             <Logo />
             <span className="sr-only">BeachPal Início</span>
          </Link>
          {children}
        </div>
      </div>
      <div className="hidden bg-muted lg:block relative">
        <img
          src="https://picsum.photos/seed/auth-beach/1200/1800"
          data-ai-hint="sunny beach"
          alt="Uma bela praia ensolarada"
          className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/30 to-background/10" />
      </div>
    </main>
  );
}
