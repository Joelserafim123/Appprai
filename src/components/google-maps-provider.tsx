'use client';

import { useJsApiLoader, type Libraries } from '@react-google-maps/api';
import { createContext, useContext, ReactNode } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const libraries: Libraries = ['places'];

interface GoogleMapsContextType {
  isLoaded: boolean;
  loadError: Error | undefined;
}

const GoogleMapsContext = createContext<GoogleMapsContextType | undefined>(undefined);

export function GoogleMapsProvider({ children }: { children: ReactNode }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-maps-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  if (!googleMapsApiKey) {
      return (
          <div className="flex h-screen w-full items-center justify-center bg-muted p-8">
              <Alert variant="destructive" className="max-w-md">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Configuração do Mapa Incompleta</AlertTitle>
                  <AlertDescription>
                  A chave da API do Google Maps não foi configurada. Por favor, adicione a variável de ambiente <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>.
                  </AlertDescription>
              </Alert>
          </div>
      );
  }

  if (loadError) {
       return (
        <div className="flex h-screen w-full items-center justify-center bg-muted p-8">
            <Alert variant="destructive" className="max-w-lg">
                <AlertTitle>Erro ao Carregar o Google Maps</AlertTitle>
                <AlertDescription>
                    <p className="mb-4">Ocorreu um problema com a sua chave de API do Google Maps. Por favor, verifique os seguintes pontos na sua <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="font-bold underline">Google Cloud Console</a>:</p>
                    <ul className="list-disc space-y-2 pl-5">
                        <li><span className="font-semibold">Faturação Ativada:</span> Certifique-se de que a faturação está ativada para o projeto associado a esta chave de API.</li>
                        <li><span className="font-semibold">API Ativada:</span> Verifique se a "Maps JavaScript API" está ativada para o seu projeto.</li>
                        <li><span className="font-semibold">Restrições de Chave:</span> Se você configurou restrições, certifique-se de que o website atual está autorizado a usar a chave.</li>
                    </ul>
                     <p className="mt-4">Se o problema persistir, a sua chave pode ser inválida.</p>
                </AlertDescription>
            </Alert>
        </div>
      );
  }

  const value = { isLoaded, loadError };

  return (
    <GoogleMapsContext.Provider value={value}>
        {isLoaded ? children : (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )}
    </GoogleMapsContext.Provider>
  );
}

export function useGoogleMaps() {
  const context = useContext(GoogleMapsContext);
  if (context === undefined) {
    throw new Error('useGoogleMaps must be used within a GoogleMapsProvider');
  }
  return context;
}
