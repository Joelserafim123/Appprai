

"use client";

import type { Tent } from "@/app/page";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, MapPin } from "lucide-react";
import Link from "next/link";
import { ScrollArea } from "./ui/scroll-area";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

const containerStyle = {
  width: '100%',
  height: '100%'
};

const defaultCenter = {
  lat: -22.9845,
  lng: -43.2040 // Default to Copacabana
};

const mapOptions = {
  styles: [
    { "featureType": "poi", "stylers": [{ "visibility": "off" }] },
    { "featureType": "road", "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
    { "featureType": "transit", "stylers": [{ "visibility": "off" }] },
    { "featureType": "landscape.natural", "elementType": "geometry.fill", "stylers": [{ "color": "#e0ffff" }] },
    { "featureType": "water", "elementType": "geometry.fill", "stylers": [{ "color": "#87ceeb" }] }
  ],
  disableDefaultUI: true,
  zoomControl: true,
  gestureHandling: 'greedy'
};

const haversineDistance = (
  coords1: { lat: number; lng: number },
  coords2: { lat: number; lng: number }
): number => {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371; // Earth radius in km

  const dLat = toRad(coords2.lat - coords1.lat);
  const dLon = toRad(coords2.lng - coords1.lng);
  const lat1 = toRad(coords1.lat);
  const lat2 = toRad(coords2.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};


export function BeachMap({ tents }: { tents: Tent[] }) {
  const [selectedTent, setSelectedTent] = useState<Tent | null>(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: googleMapsApiKey
  });
  
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const onMapLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  const onCenterChanged = () => {
    if (map) {
      const newCenter = map.getCenter();
      if (newCenter) {
        setMapCenter({
            lat: newCenter.lat(),
            lng: newCenter.lng()
        });
      }
    }
  };

  const sortedTents = useMemo(() => {
    return [...tents]
      .filter(tent => tent.latitude && tent.longitude)
      .map(tent => ({
        ...tent,
        distance: haversineDistance({ lat: mapCenter.lat, lng: mapCenter.lng }, { lat: tent.latitude!, lng: tent.longitude! }),
      }))
      .sort((a, b) => a.distance - b.distance);
  }, [tents, mapCenter]);


  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setMapCenter(userLocation);
        map?.panTo(userLocation);
      }, (error) => {
        console.warn("Aviso de Geolocalização: ", error.message);
      });
    }
  }, [map]);
  
  const handleTentSelect = (tent: Tent) => {
    setSelectedTent(tent);
    if(tent.latitude && tent.longitude) {
        map?.panTo({ lat: tent.latitude, lng: tent.longitude });
    }
  };

  const renderMap = () => {
    if (!googleMapsApiKey) {
        return (
        <div className="flex h-full items-center justify-center bg-muted p-8">
          <Alert variant="destructive" className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Configuração do Mapa Incompleta</AlertTitle>
            <AlertDescription>
              A chave da API do Google Maps não foi configurada. Por favor, adicione sua chave ao arquivo `.env.local` como `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    if (loadError) {
      return (
        <div className="flex h-full items-center justify-center bg-muted p-8">
          <Alert variant="destructive" className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Erro ao carregar o mapa</AlertTitle>
            <AlertDescription>
              Não foi possível carregar o Google Maps. Verifique a chave da API e a conexão com a internet.
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    if (!isLoaded) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-4 bg-muted">
                 <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Carregando mapa...</p>
            </div>
        );
    }

    return (
        <GoogleMap
            mapContainerStyle={containerStyle}
            center={mapCenter}
            zoom={15}
            options={mapOptions}
            onLoad={onMapLoad}
            onDragEnd={onCenterChanged}
            onZoomChanged={onCenterChanged}
        >
             {sortedTents.map((tent) => (
                tent.latitude && tent.longitude && (
                <Marker
                    key={tent.id}
                    position={{ lat: tent.latitude, lng: tent.longitude }}
                    onClick={() => handleTentSelect(tent)}
                    icon={{
                        path: google.maps.SymbolPath.CIRCLE,
                        fillColor: selectedTent?.id === tent.id ? 'hsl(var(--accent))' : 'hsl(var(--primary))',
                        fillOpacity: 1,
                        strokeColor: '#fff',
                        strokeWeight: 2,
                        scale: selectedTent?.id === tent.id ? 10 : 8,
                    }}
                />
                )
             ))}

            {selectedTent && selectedTent.latitude && selectedTent.longitude && (
                <InfoWindow
                    position={{ lat: selectedTent.latitude, lng: selectedTent.longitude }}
                    onCloseClick={() => setSelectedTent(null)}
                >
                    <div className="p-2 max-w-xs">
                        <h3 className="font-bold">{selectedTent.name}</h3>
                        <p className="text-xs text-muted-foreground">{selectedTent.beachName}</p>
                        <Button asChild size="sm" className="w-full mt-2">
                             <Link href={`/tents/${selectedTent.slug}`}>Ver Cardápio</Link>
                        </Button>
                    </div>
                </InfoWindow>
             )}
        </GoogleMap>
    );
  }

  return (
    <div className="grid h-full grid-cols-1 md:grid-cols-[350px_1fr]">
      <div className="hidden flex-col border-r md:flex">
        <div className="border-b p-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold">Barracas Próximas</h2>
                    <p className="text-sm text-muted-foreground">Ordenado pela proximidade</p>
                </div>
            </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-4 p-4">
            {sortedTents.length > 0 ? sortedTents.map((tent) => (
              <Card
                key={tent.id}
                onClick={() => handleTentSelect(tent)}
                className={`cursor-pointer transition-all ${
                  selectedTent?.id === tent.id ? "border-primary ring-2 ring-primary" : "hover:bg-muted/50"
                }`}
              >
                <CardHeader>
                  <CardTitle className="text-base">{tent.name}</CardTitle>
                   <CardDescription className="flex items-center pt-1 text-xs">
                    {tent.beachName}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span>{tent.distance.toFixed(2)} km de distância</span>
                        </div>
                        <Button asChild variant="link" size="sm" className="p-0 h-auto">
                            <Link href={`/tents/${tent.slug}`}>Ver Cardápio</Link>
                        </Button>
                    </div>
                </CardContent>
              </Card>
            )) : <p className="p-4 text-center text-sm text-muted-foreground">Nenhuma barraca encontrada.</p>}
          </div>
        </ScrollArea>
      </div>

      <div className="relative h-full w-full bg-muted">
        {renderMap()}
      </div>

    </div>
  );
}

    