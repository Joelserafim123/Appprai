"use client";

import type { Tent } from "@/lib/placeholder-data";
import { useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Star } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import Link from "next/link";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '100%'
};

const center = {
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

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""
  })

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
      path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
      fillColor: isSelected ? "#FFB347" : "#FFFFFF",
      fillOpacity: isSelected ? 1 : 0.8,
      strokeColor: isSelected ? "#FFB347" : "#000000",
      strokeWeight: 1,
      scale: 2,
      anchor: new google.maps.Point(12, 24),
    };
  };

  const getTentLocation = (tent: Tent) => {
    // This is a mock location generator based on index, replace with real data
    const baseLat = -22.9845;
    const baseLng = -43.2040;
    const offset = tents.indexOf(tent) * 0.005;
    return { lat: baseLat + offset, lng: baseLng + offset };
  }


  return (
    <div className="grid grid-cols-1 md:grid-cols-[350px_1fr] h-full">
      <div className="hidden md:flex flex-col border-r">
        <div className="p-4 border-b">
          <h2 className="text-lg font-bold">Barracas Próximas</h2>
          <p className="text-sm text-muted-foreground">Encontre o seu lugar ao sol</p>
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

      <div className="relative h-full w-full">
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={13}
            options={mapOptions}
          >
            {tents.map((tent) => (
              <Marker
                key={`marker-${tent.id}`}
                position={getTentLocation(tent)}
                onClick={() => handleMarkerClick(tent)}
                icon={getPinIcon(tent)}
                label={{
                  text: tent.name,
                  className: `-mt-10 font-bold bg-white/70 backdrop-blur-sm rounded-md px-2 py-1 text-sm ${selectedTent?.id === tent.id ? 'text-accent-foreground' : ''}`
                }}
              />
            ))}
          </GoogleMap>
        ) : <div>Carregando...</div>}
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
