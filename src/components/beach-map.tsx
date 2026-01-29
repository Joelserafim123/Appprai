
"use client";

import type { Tent } from "@/lib/types";
import { useState, useMemo, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Search, Star, AlertTriangle } from "lucide-react";
import { GoogleMap, InfoWindow, Autocomplete, AdvancedMarker } from '@react-google-maps/api';
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Input } from "./ui/input";
import { useGoogleMaps } from '@/components/google-maps-provider';
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

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

const TentMarkerIcon = ({ tent, selectedTent, favoriteTentIds }: { tent: Tent, selectedTent: Tent | null, favoriteTentIds: string[] }) => {
    let color: string;
    let zIndex = 1;

    if (selectedTent?.id === tent.id) {
      color = '#FFB347'; // accent orange for selected
      zIndex = 10;
    } else if (favoriteTentIds.includes(tent.id)) {
      color = '#FFD700'; // Gold for favorite
    } else if (tent.hasAvailableKits) {
      color = '#22c55e'; // green (available)
    } else {
      color = '#ef4444'; // red (unavailable)
    }

    return (
        <div className="relative" style={{ zIndex }}>
            <div className="map-marker-label absolute left-1/2 -translate-x-1/2">
                {tent.name}
            </div>
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36" fill={color} style={{ stroke: '#fff', strokeWidth: 1, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}>
                <path d="M12,2A9,9 0 0,1 21,11H3A9,9 0 0,1 12,2M11,12V22A1,1 0 0,0 12,23A1,1 0 0,0 13,22V12H11Z" />
            </svg>
        </div>
    );
};


export function BeachMap({ tents, favoriteTentIds }: { tents: Tent[], favoriteTentIds: string[] }) {
  const [selectedTent, setSelectedTent] = useState<Tent | null>(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [isLocating, setIsLocating] = useState(false);
  const { toast } = useToast();
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  const { isLoaded, loadError, apiKeyIsMissing } = useGoogleMaps();

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

  const onAutocompleteLoad = useCallback((ac: google.maps.places.Autocomplete) => {
    setAutocomplete(ac);
  }, []);

  const onPlaceChanged = useCallback(() => {
    if (autocomplete) {
        const place = autocomplete.getPlace();
        if (place.geometry?.viewport) {
            map?.fitBounds(place.geometry.viewport);
        } else if (place.geometry?.location) {
            map?.panTo(place.geometry.location);
            map?.setZoom(15);
        }
    }
  }, [autocomplete, map]);

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
  
  if (apiKeyIsMissing) {
    return (
        <div className="flex h-full flex-col items-center justify-center gap-4 bg-muted p-4">
            <Alert variant="destructive" className="max-w-md">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Configuração do Mapa Incompleta</AlertTitle>
                <AlertDescription>
                A chave da API do Google Maps não foi configurada (<code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>).
                </AlertDescription>
            </Alert>
        </div>
    );
  }

  if (loadError) {
      return (
          <div className="flex h-full flex-col items-center justify-center gap-4 bg-muted p-4">
              <Alert variant="destructive" className="max-w-lg">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Erro ao Carregar o Google Maps</AlertTitle>
                  <AlertDescription>Não foi possível carregar o mapa. Verifique a sua conexão ou a configuração da chave de API.</AlertDescription>
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
    <div className="h-full w-full">
        <div className="relative h-full w-full bg-muted">
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
                    <AdvancedMarker
                        key={tent.id}
                        position={{ lat: tent.location.latitude, lng: tent.location.longitude }}
                        onClick={() => handleTentSelect(tent)}
                        title={tent.name}
                    >
                       <TentMarkerIcon tent={tent} selectedTent={selectedTent} favoriteTentIds={favoriteTentIds} />
                    </AdvancedMarker>
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
            
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-full max-w-md px-4">
                <Autocomplete
                    onLoad={onAutocompleteLoad}
                    onPlaceChanged={onPlaceChanged}
                >
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Buscar por cidade ou praia..."
                            className="w-full pl-10 pr-4 h-12 rounded-full shadow-lg"
                        />
                    </div>
                </Autocomplete>
            </div>
            
            <Button
                size="icon"
                className="absolute bottom-4 left-4 z-10 rounded-full shadow-lg"
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
