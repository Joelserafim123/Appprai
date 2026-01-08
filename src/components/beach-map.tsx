"use client";

import type { Tent } from "@/lib/placeholder-data";
import { useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Star } from "lucide-react";
import { getMapBackground } from "@/lib/placeholder-data";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import Link from "next/link";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";

export function BeachMap({ tents }: { tents: Tent[] }) {
  const [selectedTent, setSelectedTent] = useState<Tent | null>(tents[0] || null);
  const [isSheetOpen, setSheetOpen] = useState(false);
  const mapBg = getMapBackground();

  const handleTentSelect = (tent: Tent) => {
    setSelectedTent(tent);
  };

  const handleMarkerClick = (tent: Tent) => {
    setSelectedTent(tent);
    setSheetOpen(true);
  };

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
                    4.5 (25 reviews)
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
        <Image
          src={mapBg.imageUrl}
          alt={mapBg.description}
          data-ai-hint={mapBg.imageHint}
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        {tents.map((tent) => (
          <div
            key={`marker-${tent.id}`}
            className="absolute -translate-x-1/2 -translate-y-full"
            style={{ left: `${tent.location.lng}%`, top: `${tent.location.lat}%` }}
          >
            <button onClick={() => handleMarkerClick(tent)} className="group focus:outline-none">
              <div className="relative">
                <MapPin
                  className={`w-10 h-10 transition-all duration-300 drop-shadow-lg
                    ${selectedTent?.id === tent.id 
                      ? "text-accent fill-accent/50 scale-125 -translate-y-1" 
                      : "text-white/80 fill-black/30 group-hover:text-accent group-focus:text-accent"
                    }`}
                />
                <Badge 
                  className="absolute -top-2 -right-4 transition-all opacity-0 group-hover:opacity-100 group-hover:-translate-y-1"
                >
                  {tent.name}
                </Badge>
              </div>
            </button>
          </div>
        ))}
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
