import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons';
import { UserCircle2 } from 'lucide-react';

export function Header() {
  const isAuthenticated = false; // Placeholder for auth state

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-7xl items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <Logo />
        </Link>
        <nav className="flex items-center space-x-2">
          {isAuthenticated ? (
            <Button asChild variant="ghost" size="icon">
              <Link href="/dashboard">
                <UserCircle2 className="h-5 w-5" />
                <span className="sr-only">Dashboard</span>
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Sign Up</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
