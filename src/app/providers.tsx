'use client';

import { I18nProvider } from '@/i18n';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { Toaster } from '@/components/ui/toaster';
import { GoogleMapsProvider } from '@/components/google-maps-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <FirebaseClientProvider>
        <GoogleMapsProvider>
          {children}
        </GoogleMapsProvider>
      </FirebaseClientProvider>
      <Toaster />
    </I18nProvider>
  );
}
