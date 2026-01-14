
'use client';

import { useParams, notFound, useRouter } from 'next/navigation';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useFirebase, useUser } from '@/firebase/provider';
import { doc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import type { Reservation, ReservationItem } from '@/lib/types';
import { Loader2, Printer, MapPin, Tent, User as UserIcon, Calendar, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Logo } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

const paymentMethodLabels: Record<string, string> = {
    card: 'Cartão',
    cash: 'Dinheiro',
    pix: 'PIX'
}

export default function ReceiptPage() {
    const { reservationId } = useParams();
    const { firestore } = useFirebase();
    const { user, isUserLoading } = useUser();
    const router = useRouter();

    const reservationRef = useMemoFirebase(() => {
        if (!firestore || !reservationId) return null;
        return doc(firestore, 'reservations', reservationId as string);
    }, [firestore, reservationId]);

    const { data: reservation, isLoading: loadingReservation, error } = useDoc<Reservation>(reservationRef);
    
    if (isUserLoading || loadingReservation) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Carregando comprovante...</p>
            </div>
        );
    }
    
    if (!reservation || error) {
        notFound();
    }
    
    if (!user || (user.uid !== reservation.userId && user.uid !== reservation.tentOwnerId)) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
                <p>Acesso negado. Você não tem permissão para ver este comprovante.</p>
                <Button onClick={() => router.push('/dashboard')}>Voltar ao Dashboard</Button>
            </div>
        );
    }

    const rentalItems = reservation.items.filter(item => item.name.includes('Kit') || item.name.includes('Cadeira'));
    const menuItems = reservation.items.filter(item => !item.name.includes('Kit') && !item.name.includes('Cadeira'));
    const allItems = [...rentalItems, ...menuItems];

    return (
        <div className="min-h-screen bg-muted flex flex-col items-center justify-center p-4 print:bg-white print:p-0">
             <style jsx global>{`
                @media print {
                    body { -webkit-print-color-adjust: exact; }
                    .no-print { display: none; }
                }
            `}</style>

            <div className="w-full max-w-2xl bg-background rounded-lg shadow-lg print:shadow-none print:border-none">
                <header className="px-8 py-6 border-b print:border-0">
                   <div className="flex justify-between items-center">
                        <Logo />
                        <div className="text-right">
                            <h2 className="text-2xl font-bold">Comprovante</h2>
                            <p className="text-sm text-muted-foreground">ID: {reservation.id.substring(0, 8)}</p>
                        </div>
                   </div>
                   <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
                        <div>
                            <h3 className="font-semibold text-muted-foreground mb-1">DE</h3>
                            <p className="font-bold flex items-center gap-2"><Tent className="w-4 h-4 text-primary" /> {reservation.tentName}</p>
                            <p>{reservation.tentOwnerName}</p>
                             <a href={`https://www.google.com/maps/search/?api=1&query=${reservation.tentLocation.latitude},${reservation.tentLocation.longitude}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                                <MapPin className="w-4 h-4"/> Ver no Mapa
                             </a>
                        </div>
                        <div className="text-right">
                             <h3 className="font-semibold text-muted-foreground mb-1">PARA</h3>
                            <p className="font-bold flex items-center justify-end gap-2"><UserIcon className="w-4 h-4 text-primary" /> {reservation.userName}</p>
                             <p>Data: {reservation.createdAt.toDate().toLocaleDateString('pt-BR')}</p>
                        </div>
                   </div>
                </header>
                <main className="px-8 py-6">
                    <div className="w-full overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b">
                                    <th className="py-2 font-semibold">Item</th>
                                    <th className="py-2 text-center font-semibold">Qtd.</th>
                                    <th className="py-2 text-right font-semibold">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                               {allItems.map((item: ReservationItem, index: number) => (
                                   <tr key={index} className="border-b border-dashed">
                                       <td className="py-2">
                                           <p className="font-medium">{item.name}</p>
                                           <p className="text-xs text-muted-foreground">R$ {item.price.toFixed(2)} cada</p>
                                       </td>
                                       <td className="py-2 text-center">{item.quantity}</td>
                                       <td className="py-2 text-right">R$ {(item.price * item.quantity).toFixed(2)}</td>
                                   </tr>
                               ))}
                            </tbody>
                        </table>
                    </div>
                     <div className="mt-6 flex justify-end">
                        <div className="w-full max-w-xs space-y-2">
                             <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Total Pago</span>
                                <span className="font-bold">R$ {reservation.total.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Método</span>
                                <span className="font-bold">{reservation.paymentMethod ? paymentMethodLabels[reservation.paymentMethod] : 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </main>
                 <footer className="px-8 py-4 text-center text-xs text-muted-foreground border-t">
                    Obrigado por usar o BeachPal!
                </footer>
            </div>
             <div className="mt-6 w-full max-w-2xl flex justify-end gap-2 no-print">
                <Button variant="outline" asChild>
                    <Link href="/dashboard/my-reservations">Voltar</Link>
                </Button>
                <Button onClick={() => window.print()}>
                    <Printer className="mr-2 h-4 w-4"/>
                    Imprimir / Salvar PDF
                </Button>
            </div>
        </div>
    );
}
