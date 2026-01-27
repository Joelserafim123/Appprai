import './globals.css';
import { cn } from '@/lib/utils';
import type { Metadata } from 'next';
import { PT_Sans } from 'next/font/google';
import { Providers } from './providers';

const ptSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-body',
});

export const metadata: Metadata = {
  title: 'BeachPal',
  description: 'Encontre e peça das melhores barracas de praia.',
  icons: [{ rel: 'icon', url: '/favicon.ico' }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={ptSans.variable}>
      <body
        className={cn(
          'min-h-screen bg-background font-body antialiased'
        )}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
