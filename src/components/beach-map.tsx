
"use client";

import type { Tent } from "@/lib/types";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, MapPin, List } from "lucide-react";
import Link from "next/link";
import { ScrollArea } from "./ui/scroll-area";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";


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

function TentList({ tents, selectedTent, onTentSelect }: { tents: Tent[], selectedTent: Tent | null, onTentSelect: (tent: Tent) => void }) {
  const [isLocating, setIsLocating] = useState(false);

  const handleGetCurrentLocation = () => {
    // A lógica de geolocalização foi movida para o componente pai para controlar o mapa
    // Este botão pode ser adaptado para chamar uma função passada por props se necessário
  }

  return (
    <>
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Barracas Próximas</h2>
            <p className="text-sm text-muted-foreground">Ordenado pela proximidade</p>
          </div>
          <Button
            size="icon"
            variant="outline"
            onClick={handleGetCurrentLocation}
            disabled={isLocating}
            aria-label="Usar minha localização atual"
            className="rounded-full"
          >
            {isLocating ? <Loader2 className="animate-spin" /> : <MapPin />}
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          {tents.length > 0 ? tents.map((tent) => (
            <Card
              key={tent.id}
              onClick={() => onTentSelect(tent)}
              className={`cursor-pointer transition-all ${selectedTent?.id === tent.id ? "border-primary ring-2 ring-primary" : "hover:bg-muted/50"
                }`}
            >
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  {tent.name}
                  <span className={cn(
                    'text-xs font-semibold',
                    tent.hasAvailableKits ? 'text-green-600' : 'text-red-600'
                  )}>
                    {tent.hasAvailableKits ? '(Disponível)' : '(Aluguel Indisponível)'}
                  </span>
                </CardTitle>
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
    </>
  );
}


export function BeachMap({ tents }: { tents: Tent[] }) {
  const [selectedTent, setSelectedTent] = useState<Tent | null>(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [isLocating, setIsLocating] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: googleMapsApiKey ? googleMapsApiKey : '',
    libraries: ['marker']
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

  const handleGetCurrentLocation = () => {
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
        toast({ title: "Localização encontrada!", description: "Exibindo barracas perto de você." });
        setIsLocating(false);
      },
      (error) => {
        console.error("Erro de Geolocalização: ", error.message);
        toast({ variant: "destructive", title: "Não foi possível obter sua localização.", description: "Por favor, verifique as permissões de localização do seu navegador." });
        setIsLocating(false);
      }
    );
  };

  const sortedTents = useMemo(() => {
    if (!tents) return [];
    return [...tents]
      .filter(tent => tent.location?.latitude && tent.location?.longitude)
      .map(tent => ({
        ...tent,
        distance: haversineDistance({ lat: mapCenter.lat, lng: mapCenter.lng }, { lat: tent.location.latitude, lng: tent.location.longitude }),
      }))
      .sort((a, b) => a.distance - b.distance);
  }, [tents, mapCenter]);


  useEffect(() => {
    if (map && tents.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      tents.forEach(tent => {
        if (tent.location?.latitude && tent.location?.longitude) {
          bounds.extend(new window.google.maps.LatLng(tent.location.latitude, tent.location.longitude));
        }
      });
      if (bounds.isEmpty()) {
        map.setCenter(defaultCenter);
        map.setZoom(12);
      } else {
        if (tents.length > 1) {
          map.fitBounds(bounds);
          const listener = window.google.maps.event.addListenerOnce(map, 'idle', () => {
            if (map.getZoom()! > 16) map.setZoom(16);
            window.google.maps.event.removeListener(listener);
          });
        } else {
          map.setCenter(bounds.getCenter());
          map.setZoom(15);
        }
      }
    } else if (map) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setMapCenter(userLocation);
          map?.panTo(userLocation);
        }, (error) => {
          console.warn("Aviso de Geolocalização na carga inicial: ", error.message);
        });
      }
    }
  }, [map, tents]);

  const handleTentSelect = (tent: Tent) => {
    setSelectedTent(tent);
    if (tent.location?.latitude && tent.location?.longitude) {
      map?.panTo({ lat: tent.location.latitude, lng: tent.location.longitude });
    }
    if (isMobile) {
      setIsSheetOpen(false);
    }
  };

  const getMarkerIcon = (tent: Tent): google.maps.Symbol => {
    let color = 'hsl(0, 84.2%, 60.2%)'; // destructive red

    if (selectedTent?.id === tent.id) {
      color = 'hsl(var(--accent))'; // yellow
    } else if (tent.hasAvailableKits) {
      color = 'hsl(142.1, 76.2%, 36.3%)'; // green
    }

    return {
      path: "M12,2A9,9 0 0,1 21,11H3A9,9 0 0,1 12,2M11,12V22A1,1 0 0,0 12,23A1,1 0 0,0 13,22V12H11Z",
      fillColor: color,
      fillOpacity: 1,
      strokeColor: '#fff',
      strokeWeight: 1,
      scale: 1,
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
          tent.location.latitude && tent.location.longitude && (
            <Marker
              key={tent.id}
              position={{ lat: tent.location.latitude, lng: tent.location.longitude }}
              onClick={() => handleTentSelect(tent)}
              icon={getMarkerIcon(tent)}
              label={{
                text: tent.name,
                color: 'black',
                fontSize: '12px',
                fontWeight: 'bold',
                className: 'map-marker-label'
              }}
            />
          )
        ))}

        {selectedTent && selectedTent.location.latitude && selectedTent.location.longitude && (
          <InfoWindow
            position={{ lat: selectedTent.location.latitude, lng: selectedTent.location.longitude }}
            onCloseClick={() => setSelectedTent(null)}
          >
            <div className="p-2 max-w-xs">
              <h3 className="font-bold">{selectedTent.name}</h3>
              <p className="text-xs text-muted-foreground">{selectedTent.beachName}</p>
              <p className={cn(
                'text-xs font-semibold mt-1',
                selectedTent.hasAvailableKits ? 'text-green-600' : 'text-red-600'
              )}>
                {selectedTent.hasAvailableKits ? 'Aluguel Disponível' : 'Aluguel Indisponível'}
              </p>
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
    <div className="h-full w-full">
       <style jsx global>{`
        .map-marker-label {
          transform: translateY(20px);
        }
      `}</style>
      <div className="md:grid h-full grid-cols-1 md:grid-cols-[350px_1fr]">
        <div className="hidden md:flex flex-col border-r">
          <TentList tents={sortedTents} selectedTent={selectedTent} onTentSelect={handleTentSelect} />
        </div>

        <div className="relative h-full w-full bg-muted">
          {renderMap()}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 md:hidden">
             <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetTrigger asChild>
                    <Button className="shadow-lg">
                        <List className="mr-2 h-4 w-4"/>
                        Ver Barracas
                    </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[80%] flex flex-col">
                    <TentList tents={sortedTents} selectedTent={selectedTent} onTentSelect={handleTentSelect} />
                </SheetContent>
            </Sheet>
          </div>
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
    </div>
  );
}
