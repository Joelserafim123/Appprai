"use client";

import type { Tent } from "@/lib/types";
import { useState, useMemo, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, MapPin, Star } from "lucide-react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";


const containerStyle = {
  width: '100%',
  height: '100%'
};

const defaultCenter = {
  lat: -22.9845,
  lng: -43.2040 // Padrão para Copacabana
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
  zoomControl: false,
  gestureHandling: 'greedy'
};

const haversineDistance = (
  coords1: { lat: number; lng: number },
  coords2: { lat: number; lng: number }
): number => {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371; // Raio da Terra em km

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


export function BeachMap({ tents, favoriteTentIds }: { tents: Tent[], favoriteTentIds: string[] }) {
  const [selectedTent, setSelectedTent] = useState<Tent | null>(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [isLocating, setIsLocating] = useState(false);
  const { toast } = useToast();
  const { locale } = useI18n();

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: googleMapsApiKey,
    libraries: ['marker'],
    language: locale.split('-')[0] // 'pt-BR' -> 'pt'
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

  const handleGetCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast({ variant: "destructive", title: "Geolocalização não suportada." });
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setMapCenter(userLocation);
        map?.panTo(userLocation);
        map?.setZoom(15);
        toast({ title: "Localização encontrada!", description: "Mostrando barracas perto de você." });
        setIsLocating(false);
      },
      (error) => {
        console.error("Erro de Geolocalização: ", error.message);
        toast({ variant: "destructive", title: "Não foi possível obter sua localização.", description: "Por favor, verifique as permissões de localização do seu navegador." });
        setIsLocating(false);
      }
    );
  }, [map, toast]);

  const sortedTents = useMemo(() => {
    if (!tents) return [];
    
    return tents
      .filter(tent => tent.location?.latitude && tent.location?.longitude)
      .map(tent => ({
        ...tent,
        distance: haversineDistance({ lat: mapCenter.lat, lng: mapCenter.lng }, { lat: tent.location.latitude, lng: tent.location.longitude }),
      }))
      .sort((a, b) => a.distance - b.distance);
  }, [tents, mapCenter]);


  useEffect(() => {
    if (map && tents.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      let hasLocations = false;
      tents.forEach(tent => {
        if (tent.location?.latitude && tent.location?.longitude) {
          bounds.extend(new google.maps.LatLng(tent.location.latitude, tent.location.longitude));
          hasLocations = true;
        }
      });

      if (hasLocations) {
        map.fitBounds(bounds);
      }
    }
  }, [map, tents]);

  const handleTentSelect = (tent: Tent) => {
    setSelectedTent(tent);
    if (tent.location?.latitude && tent.location?.longitude) {
      map?.panTo({ lat: tent.location.latitude, lng: tent.location.longitude });
    }
  };

  const getMarkerIcon = (tent: Tent): google.maps.Symbol => {
    let color: string;
    const isFavorite = favoriteTentIds.includes(tent.id);

    if (selectedTent?.id === tent.id) {
      color = 'hsl(var(--accent))'; // accent orange for selected (highest priority)
    } else if (isFavorite) {
      color = 'hsl(50, 100%, 50%)'; // Gold for favorite
    } else if (tent.hasAvailableKits) {
      color = 'hsl(142.1, 76.2%, 36.3%)'; // green (available)
    } else {
      color = 'hsl(0, 84.2%, 60.2%)'; // red (unavailable)
    }

    return {
      path: "M12,2A9,9 0 0,1 21,11H3A9,9 0 0,1 12,2M11,12V22A1,1 0 0,0 12,23A1,1 0 0,0 13,22V12H11Z",
      fillColor: color,
      fillOpacity: 1,
      strokeColor: '#fff',
      strokeWeight: 1,
      scale: 1.5,
      anchor: new google.maps.Point(12, 12),
    };
  }

  const renderMap = () => {
    if (!googleMapsApiKey) {
      return (
        <div className="flex h-full items-center justify-center bg-muted p-8">
          <Alert variant="destructive" className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Configuração do Mapa Incompleta</AlertTitle>
            <AlertDescription>
              A chave da API do Google Maps não foi configurada. Por favor, adicione a variável de ambiente <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> ao seu ambiente.
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    if (loadError) {
      return (
        <div className="flex h-full items-center justify-center bg-muted p-8">
            <Alert variant="destructive" className="max-w-lg">
                <AlertTitle>Erro ao Carregar o Google Maps</AlertTitle>
                <AlertDescription>
                    <p className="mb-4">Ocorreu um problema com a sua chave de API do Google Maps. Por favor, verifique os seguintes pontos na sua <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="font-bold underline">Google Cloud Console</a>:</p>
                    <ul className="list-disc space-y-2 pl-5">
                        <li>
                            <span className="font-semibold">Faturação Ativada:</span> Certifique-se de que a faturação está ativada para o projeto associado a esta chave de API.
                        </li>
                        <li>
                            <span className="font-semibold">API Ativada:</span> Verifique se a "Maps JavaScript API" está ativada para o seu projeto.
                        </li>
                        <li>
                            <span className="font-semibold">Restrições de Chave:</span> Se você configurou restrições, certifique-se de que o website atual está autorizado a usar a chave.
                        </li>
                    </ul>
                    <p className="mt-4">Se o problema persistir após verificar estes pontos, a sua chave pode ser inválida.</p>
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
        zoom={12}
        options={mapOptions}
        onLoad={onMapLoad}
        onDragEnd={onCenterChanged}
        onZoomChanged={onCenterChanged}
      >
        {sortedTents.map((tent) => (
          tent.location.latitude && tent.location.longitude && (
            <Marker
              key={tent.id}
              position={{ lat: tent.location.latitude, lng: tent.location.longitude }}
              onClick={() => handleTentSelect(tent)}
              icon={getMarkerIcon(tent)}
            />
          )
        ))}

        {selectedTent && selectedTent.location.latitude && selectedTent.location.longitude && (
          <InfoWindow
            position={{ lat: selectedTent.location.latitude, lng: selectedTent.location.longitude }}
            onCloseClick={() => setSelectedTent(null)}
          >
            <div className="p-2 max-w-xs">
              <h3 className="font-bold flex items-center gap-2">
                {selectedTent.name}
                {favoriteTentIds.includes(selectedTent.id) && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
              </h3>
              <p className="text-xs text-muted-foreground">{selectedTent.beachName}</p>
              <p className={cn(
                'text-xs font-semibold mt-1',
                selectedTent.hasAvailableKits ? 'text-green-600' : 'text-red-600'
              )}>
                {selectedTent.hasAvailableKits ? 'Aluguéis Disponíveis' : 'Aluguéis Indisponíveis'}
              </p>
              <Button asChild size="sm" className="w-full mt-2">
                  <a href={`/tents/${selectedTent.id}`}>Ver Cardápio e Alugar</a>
              </Button>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    );
  }

  return (
    <div className="h-full w-full">
      <div className="relative h-full w-full bg-muted">
          {renderMap()}
          <Button
            size="icon"
            className="absolute bottom-4 right-4 z-10 rounded-full shadow-lg"
            onClick={handleGetCurrentLocation}
            disabled={isLocating}
            aria-label="Usar minha localização atual"
          >
            {isLocating ? <Loader2 className="animate-spin" /> : <MapPin />}
          </Button>
        </div>
    </div>
  );
}
