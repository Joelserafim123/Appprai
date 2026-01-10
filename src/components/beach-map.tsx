"use client";

import type { Tent } from "@/lib/placeholder-data";
import { useState, useEffect } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LocateIcon, Star, AlertTriangle } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import Link from "next/link";
import { ScrollArea } from "./ui/scroll-area";
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

const containerStyle = {
  width: '100%',
  height: '100%'
};

const defaultCenter = {
  lat: -22.9845,
  lng: -43.2040
};

const mapOptions = {
  styles: [
    {
      "featureType": "poi",
      "stylers": [
        { "visibility": "off" }
      ]
    },
    {
      "featureType": "road",
      "elementType": "labels",
      "stylers": [
        { "visibility": "off" }
      ]
    },
    {
      "featureType": "transit",
      "stylers": [
        { "visibility": "off" }
      ]
    },
     {
        "featureType": "landscape.natural",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "color": "#e0ffff"
            }
        ]
    },
    {
        "featureType": "water",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "color": "#87ceeb"
            }
        ]
    }
  ],
  disableDefaultUI: true,
  zoomControl: true,
};

export function BeachMap({ tents }: { tents: Tent[] }) {
  const [selectedTent, setSelectedTent] = useState<Tent | null>(tents[0] || null);
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [center, setCenter] = useState(defaultCenter);
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""
  })

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userCoords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(userCoords);
          setCenter(userCoords);
          setLoadingLocation(false);
        },
        () => {
          // Error or permission denied
          setLoadingLocation(false);
          // Keep default center
        }
      );
    } else {
      // Browser doesn't support Geolocation
      setLoadingLocation(false);
    }
  }, []);

  const handleTentSelect = (tent: Tent) => {
    setSelectedTent(tent);
  };

  const handleMarkerClick = (tent: Tent) => {
    setSelectedTent(tent);
    setSheetOpen(true);
  };
  
  const getPinIcon = (tent: Tent) => {
    const isSelected = selectedTent?.id === tent.id;
    return {
      url: '/beach-umbrella.svg',
      scaledSize: isSelected ? new google.maps.Size(48, 48) : new google.maps.Size(32, 32),
      anchor: new google.maps.Point(16, 32),
    };
  };

  const getTentLocation = (tent: Tent) => {
    return tent.location;
  }
  
  const handleUseMyLocatioClick = () => {
    if(userLocation) {
        setCenter(userLocation)
    }
  }

  const renderMap = () => {
    if (loadError) {
      return (
        <div className="flex items-center justify-center h-full p-4 sm:p-8">
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Ação Necessária: Erro na API do Google Maps</AlertTitle>
                <AlertDescription>
                    <p className="font-semibold mb-2">
                        O mapa não pode ser carregado. O erro `ApiTargetBlockedMapError` indica que a sua chave de API do Google Maps não tem permissão para ser usada neste domínio.
                    </p>
                    <p className="text-sm mt-3">
                        **Como corrigir:**
                    </p>
                    <ol className="list-decimal list-inside text-sm space-y-1 mt-1">
                        <li>Vá ao <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="underline font-medium">Console do Google Cloud</a>.</li>
                        <li>Edite a sua chave de API.</li>
                        <li>Na seção "Restrições de aplicativo", selecione a opção **"Nenhuma"** para as "Restrições de site".</li>
                        <li>Clique em "Salvar".</li>
                    </ol>
                     <p className="text-xs mt-3 text-muted-foreground">Pode levar alguns minutos para que as alterações entrem em vigor. Após salvar, reinicie o servidor de desenvolvimento.</p>
                </AlertDescription>
            </Alert>
        </div>
      );
    }

    if (!isLoaded || loadingLocation) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                 <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-muted-foreground">Carregando mapa e sua localização...</p>
            </div>
        );
    }

    return (
        <GoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={15}
            options={mapOptions}
        >
            {userLocation && <Marker position={userLocation} title="Sua Localização" />}
            {tents.map((tent) => (
            <Marker
                key={`marker-${tent.id}`}
                position={getTentLocation(tent)}
                onClick={() => handleMarkerClick(tent)}
                icon={getPinIcon(tent)}
                title={tent.name}
            />
            ))}
        </GoogleMap>
    );
  }


  return (
    <div className="grid grid-cols-1 md:grid-cols-[350px_1fr] h-full">
      <div className="hidden md:flex flex-col border-r">
        <div className="p-4 border-b">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-bold">Barracas Próximas</h2>
                    <p className="text-sm text-muted-foreground">Encontre o seu lugar ao sol</p>
                </div>
                <Button variant="ghost" size="icon" onClick={handleUseMyLocatioClick} disabled={!userLocation}>
                    <LocateIcon className="h-5 w-5"/>
                    <span className="sr-only">Usar minha localização</span>
                </Button>
            </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {tents.map((tent) => (
              <Card
                key={tent.id}
                onClick={() => handleTentSelect(tent)}
                className={`cursor-pointer transition-all ${
                  selectedTent?.id === tent.id ? "border-primary ring-2 ring-primary" : "hover:bg-muted/50"
                }`}
              >
                <CardHeader>
                  <CardTitle className="text-base">{tent.name}</CardTitle>
                   <CardDescription className="flex items-center text-xs pt-1">
                    <Star className="w-3 h-3 mr-1 fill-accent stroke-accent" /> 
                    4.5 (25 avaliações)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild size="sm" className="w-full">
                    <Link href={`/tents/${tent.slug}`}>Ver Cardápio</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="relative h-full w-full bg-muted">
        {renderMap()}
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-[380px] sm:max-w-none">
          {selectedTent && (
            <>
              <SheetHeader>
                <div className="relative h-48 -mx-6 -mt-6">
                  <Image src={selectedTent.images[0].imageUrl} alt={selectedTent.name} fill className="object-cover" />
                </div>
                <SheetTitle className="text-2xl pt-6">{selectedTent.name}</SheetTitle>
                <SheetDescription>{selectedTent.description}</SheetDescription>
              </SheetHeader>
              <div className="py-8">
                <Button asChild className="w-full" size="lg">
                  <Link href={`/tents/${selectedTent.slug}`}>Ver Detalhes e Cardápio</Link>
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}