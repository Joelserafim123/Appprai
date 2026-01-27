'use client';

import { I18nProvider } from '@/i18n';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { Toaster } from '@/components/ui/toaster';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <FirebaseClientProvider>
        {children}
      </FirebaseClientProvider>
      <Toaster />
    </I18nProvider>
  );
}
