'use client';

import { useJsApiLoader, type Libraries } from '@react-google-maps/api';
import { createContext, useContext, ReactNode, useMemo } from 'react';

const libraries: Libraries = ['places'];

interface GoogleMapsContextType {
  isLoaded: boolean;
  loadError: Error | undefined;
  apiKeyIsMissing: boolean;
}

const GoogleMapsContext = createContext<GoogleMapsContextType | undefined>(undefined);

export function GoogleMapsProvider({ children }: { children: ReactNode }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const apiKeyIsMissing = !apiKey;

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-maps-script', // Using a single, consistent ID
    googleMapsApiKey: apiKey,
    libraries,
    // Disable the loader if the API key is missing. The consuming components will show an error.
    disabled: apiKeyIsMissing,
  });

  const value = useMemo(() => ({
    isLoaded,
    loadError,
    apiKeyIsMissing,
  }), [isLoaded, loadError, apiKeyIsMissing]);

  return (
    <GoogleMapsContext.Provider value={value}>
        {children}
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
