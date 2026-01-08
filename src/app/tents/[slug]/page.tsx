import { getTentBySlug } from '@/lib/placeholder-data';
import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/header';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { Armchair, Minus, Plus, ShoppingCart, Umbrella, MapPin, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function TentPage({ params }: { params: { slug: string } }) {
  const tent = getTentBySlug(params.slug);

  if (!tent) {
    notFound();
  }

  const menuByCategory = tent.menu.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof tent.menu>);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <div className="relative h-64 md:h-96 w-full">
          <Image
            src={tent.images[0].imageUrl}
            alt={tent.name}
            data-ai-hint={tent.images[0].imageHint}
            className="object-cover"
            fill
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 p-8 text-white">
            <h1 className="text-4xl md:text-6xl font-extrabold drop-shadow-lg">{tent.name}</h1>
            <p className="mt-2 text-lg max-w-2xl drop-shadow-md">{tent.description}</p>
          </div>
        </div>

        <div className="container mx-auto max-w-7xl py-8 px-4">
          <Tabs defaultValue="menu" className="w-full">
            <TabsList className="grid w-full grid-cols-3 md:w-[400px]">
              <TabsTrigger value="menu">Cardápio</TabsTrigger>
              <TabsTrigger value="reserve">Reservar</TabsTrigger>
              <TabsTrigger value="gallery">Galeria</TabsTrigger>
            </TabsList>

            <TabsContent value="menu" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Nosso Cardápio</CardTitle>
                  <CardDescription>Peça online e aproveite a praia sem preocupações.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="multiple" defaultValue={Object.keys(menuByCategory)} className="w-full">
                    {Object.entries(menuByCategory).map(([category, items]) => (
                      <AccordionItem key={category} value={category}>
                        <AccordionTrigger className="text-lg font-semibold">{category}</AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 pt-2">
                            {items.map((item) => (
                              <div key={item.id} className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">{item.name}</p>
                                  <p className="text-sm text-muted-foreground">{item.description}</p>
                                  <p className="text-sm font-bold text-primary">R$ {item.price.toFixed(2)}</p>
                                </div>
                                <Button size="sm" variant="outline">
                                  <ShoppingCart className="mr-2 h-4 w-4" />
                                  Pedir
                                </Button>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reserve" className="mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Reservar Mesas e Cadeiras</CardTitle>
                        <CardDescription>Garanta seu lugar ao sol antes de chegar.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {tent.rentals.map((rental) => (
                             <div key={rental.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg">
                                <div>
                                    <h3 className="font-semibold text-lg flex items-center gap-2">
                                        {rental.name.includes('Kit') ? <><Umbrella className="w-5 h-5"/> + <Armchair className="w-5 h-5"/></> : rental.name.includes('Guarda-sol') ? <Umbrella className="w-5 h-5"/> : <Armchair className="w-5 h-5"/>}
                                        {rental.name}
                                    </h3>
                                    <p className="text-2xl font-bold text-primary">R$ {rental.price.toFixed(2)}</p>
                                </div>
                                <div className="flex items-center gap-2 mt-4 sm:mt-0">
                                    <Button variant="outline" size="icon" className="h-8 w-8"><Minus className="h-4 w-4"/></Button>
                                    <Input type="number" readOnly value={0} className="w-16 h-8 text-center" />
                                    <Button variant="outline" size="icon" className="h-8 w-8"><Plus className="h-4 w-4"/></Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                    <CardFooter className="flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                         <div className="flex-1">
                            <p className="text-sm text-muted-foreground">Total</p>
                            <p className="text-3xl font-bold">R$ 0.00</p>
                        </div>
                        <Button size="lg" className="w-full sm:w-auto">Finalizar Reserva</Button>
                    </CardFooter>
                </Card>
            </TabsContent>

            <TabsContent value="gallery" className="mt-6">
               <Card>
                    <CardHeader>
                        <CardTitle>Galeria de Fotos</CardTitle>
                        <CardDescription>Um pouco do nosso paraíso.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Carousel className="w-full">
                            <CarouselContent>
                                {tent.images.map((img, index) => (
                                <CarouselItem key={index}>
                                    <div className="p-1">
                                    <Card>
                                        <CardContent className="flex aspect-video items-center justify-center p-0 relative overflow-hidden rounded-lg">
                                             <Image src={img.imageUrl} alt={img.description} fill data-ai-hint={img.imageHint} className="object-cover"/>
                                        </CardContent>
                                    </Card>
                                    </div>
                                </CarouselItem>
                                ))}
                            </CarouselContent>
                            <CarouselPrevious />
                            <CarouselNext />
                        </Carousel>
                    </CardContent>
                </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
