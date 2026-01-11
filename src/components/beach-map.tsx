
"use client";

import type { Tent } from "@/app/page";
import { useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, AlertTriangle, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import Link from "next/link";
import { ScrollArea } from "./ui/scroll-area";
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
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
  lng: -43.2040 // Default to Copacabana
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
  const [center] = useState(defaultCenter);
  
  const { db } = useFirebase();
  const imagesQuery = selectedTent ? collection(db!, 'tents', selectedTent.id, 'images') : null;
  
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""
  })
  
  const handleTentSelect = (tent: Tent) => {
    setSelectedTent(tent);
  };
  
  const renderMap = () => {
    if (loadError) {
      return (
        <div className="flex h-full items-center justify-center bg-muted p-8">
          <Alert variant="destructive" className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Erro ao carregar o mapa</AlertTitle>
            <AlertDescription>
              Não foi possível carregar o Google Maps. Verifique a chave da API e tente novamente. A aplicação continuará funcionando, mas o mapa não será exibido.
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
            center={center}
            zoom={15}
            options={mapOptions}
        >
            {/* Markers are disabled as we don't have coordinates. In a future implementation, we could geocode the beachName. */}
        </GoogleMap>
    );
  }

  return (
    <div className="grid h-full grid-cols-1 md:grid-cols-[350px_1fr]">
      <div className="hidden flex-col border-r md:flex">
        <div className="border-b p-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold">Barracas na Praia</h2>
                    <p className="text-sm text-muted-foreground">Encontre o seu lugar ao sol</p>
                </div>
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
                    {tent.beachName}
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

    </div>
  );
}

    
