
"use client";

import type { Tent } from "@/app/page";
import { useState, useEffect } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LocateIcon, Star, AlertTriangle, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import Link from "next/link";
import { ScrollArea } from "./ui/scroll-area";
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { useCollection } from "@/firebase/firestore/use-collection";
import { useFirebase } from "@/firebase/provider";
import { collection } from "firebase/firestore";

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
    { "featureType": "poi", "stylers": [{ "visibility": "off" }] },
    { "featureType": "road", "elementType": "labels", "stylers": [{ "visibility": "off" }] },
    { "featureType": "transit", "stylers": [{ "visibility": "off" }] },
    { "featureType": "landscape.natural", "elementType": "geometry.fill", "stylers": [{ "color": "#e0ffff" }] },
    { "featureType": "water", "elementType": "geometry.fill", "stylers": [{ "color": "#87ceeb" }] }
  ],
  disableDefaultUI: true,
  zoomControl: true,
  gestureHandling: 'greedy'
};

interface TentImage {
  id: string;
  imageUrl: string;
}

export function BeachMap({ tents }: { tents: Tent[] }) {
  const [selectedTent, setSelectedTent] = useState<Tent | null>(tents[0] || null);
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [center, setCenter] = useState(defaultCenter);
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  const { db } = useFirebase();
  const imagesQuery = selectedTent ? collection(db!, 'tents', selectedTent.id, 'images') : null;
  const { data: tentImages, loading: loadingImages } = useCollection<TentImage>(imagesQuery);


  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""
  })

  useEffect(() => {
    setLoadingLocation(true);
    setLocationError(null);
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
        (error) => {
          setLocationError("Não foi possível obter sua localização. O mapa será centralizado em um local padrão.");
          console.error("Geolocation error:", error);
          setLoadingLocation(false);
          setCenter(defaultCenter);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setLocationError("Geolocalização não é suportada por este navegador.");
      setLoadingLocation(false);
      setCenter(defaultCenter);
    }
  }, []);

  const handleTentSelect = (tent: Tent) => {
    setSelectedTent(tent);
    if (tent.location) {
      setCenter(tent.location);
    }
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

  const getUserPinIcon = () => {
    return {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 7,
      fillColor: '#4285F4',
      fillOpacity: 1,
      strokeColor: 'white',
      strokeWeight: 2,
    }
  }

  const getTentLocation = (tent: Tent) => {
    return tent.location;
  }
  
  const handleUseMyLocatioClick = () => {
    if(userLocation) {
        setCenter(userLocation)
    } else {
        // Re-trigger location request
        setLoadingLocation(true);
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
            (error) => {
              setLocationError("Não foi possível obter sua localização. Verifique as permissões do seu navegador.");
              setLoadingLocation(false);
            }
        );
    }
  }

  const renderMap = () => {
    if (loadError) {
      return (
        <div className="flex h-full items-center justify-center bg-muted p-8">
          <Alert variant="destructive" className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Erro ao carregar o mapa</AlertTitle>
            <AlertDescription>
             Não foi possível carregar o Google Maps. Verifique se a chave da API é válida e tente novamente. O resto da aplicação continuará funcionando.
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    if (!isLoaded || loadingLocation) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-4 bg-muted">
                 <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Carregando mapa...</p>
            </div>
        );
    }

    return (
        <>
        {locationError && (
             <Alert variant="destructive" className="absolute top-4 left-4 z-10 w-auto max-w-sm">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Erro de Localização</AlertTitle>
                <AlertDescription>{locationError}</AlertDescription>
            </Alert>
        )}
        <GoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={15}
            options={mapOptions}
        >
            {userLocation && <Marker position={userLocation} title="Sua Localização" icon={getUserPinIcon()} />}
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
        </>
    );
  }

  return (
    <div className="grid h-full grid-cols-1 md:grid-cols-[350px_1fr]">
      <div className="hidden flex-col border-r md:flex">
        <div className="border-b p-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold">Barracas Próximas</h2>
                    <p className="text-sm text-muted-foreground">Encontre o seu lugar ao sol</p>
                </div>
                <Button variant="ghost" size="icon" onClick={handleUseMyLocatioClick}>
                    <LocateIcon className="h-5 w-5"/>
                    <span className="sr-only">Usar minha localização</span>
                </Button>
            </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-4 p-4">
            {tents.length > 0 ? tents.map((tent) => (
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
                    <Star className="mr-1 h-3 w-3 fill-accent stroke-accent" /> 
                    4.5 (25 avaliações)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild size="sm" className="w-full">
                    <Link href={`/tents/${tent.slug}`}>Ver Cardápio</Link>
                  </Button>
                </CardContent>
              </Card>
            )) : <p className="p-4 text-center text-sm text-muted-foreground">Nenhuma barraca encontrada.</p>}
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
                <div className="relative -mx-6 -mt-6 h-48 bg-muted">
                  {loadingImages ? <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : tentImages && tentImages.length > 0 ? (
                     <Image src={tentImages[0].imageUrl} alt={selectedTent.name} fill className="object-cover" />
                  ): <div className="flex h-full w-full items-center justify-center text-muted-foreground">Nenhuma imagem</div>}
                </div>
                <SheetTitle className="pt-6 text-2xl">{selectedTent.name}</SheetTitle>
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
