'use client';

import { Button } from '@/components/ui/button';
import { Utensils } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function OrderPage() {
    const router = useRouter();

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center gap-4 text-center">
            <Utensils className="h-12 w-12 text-muted-foreground" />
            <h1 className="text-2xl font-bold">Funcionalidade Indisponível</h1>
            <p className="text-muted-foreground max-w-sm">A adição de novos itens a uma reserva existente não é mais suportada. Todos os itens devem ser adicionados durante a criação da reserva.</p>
            <Button onClick={() => router.back()}>Voltar</Button>
        </div>
    );
}
