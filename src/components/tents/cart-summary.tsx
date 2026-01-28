'use client';

import { useCartStore } from '@/hooks/use-cart-store';
import { useUser } from '@/firebase/provider';
import type { Tent, RentalItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, ShoppingCart, ArrowRight, AlertTriangle, Info } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useTranslations } from '@/i18n';

interface CartSummaryProps {
  tent: Tent;
  rentalKit?: RentalItem;
  isOwnerViewingOwnTent: boolean;
  hasActiveReservation: boolean;
  isSubmitting: boolean;
  activeTab: string;
  handleProceedToMenu: () => void;
  handleCreateReservation: () => void;
}

export function CartSummary({
  tent,
  rentalKit,
  isOwnerViewingOwnTent,
  hasActiveReservation,
  isSubmitting,
  activeTab,
  handleProceedToMenu,
  handleCreateReservation,
}: CartSummaryProps) {
  const { user } = useUser();
  const cart = useCartStore((state) => state.cart);
  const t_products = useTranslations('Shared.ProductNames');

  const rentalTotal = Object.values(cart).filter(i => i.type === 'rental').reduce((acc, { item, quantity }) => acc + item.price * quantity, 0);
  const menuTotal = Object.values(cart).filter(i => i.type === 'menu').reduce((acc, { item, quantity }) => acc + item.price * quantity, 0);
  const kitsInCart = rentalKit ? (cart[rentalKit.id]?.quantity || 0) : 0;
  
  const baseFeeWaiverAmount = tent.minimumOrderForFeeWaiver || 0;
  const proportionalFeeWaiverAmount = baseFeeWaiverAmount * kitsInCart;
  
  const isFeeWaived = proportionalFeeWaiverAmount > 0 && rentalTotal > 0 && menuTotal >= proportionalFeeWaiverAmount;
  
  const cartTotal = isFeeWaived ? menuTotal : menuTotal + rentalTotal;
  const finalTotal = cartTotal + (user?.outstandingBalance || 0);

  const isCartEmpty = Object.keys(cart).length === 0;
  const hasRentalKitInCart = !!rentalKit && (cart[rentalKit.id]?.quantity || 0) > 0;

  return (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle>Sua Reserva</CardTitle>
        <CardDescription>Revise seus itens antes de fazer a reserva.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isCartEmpty ? (
          <p className="text-center text-muted-foreground">Seu carrinho está vazio.</p>
        ) : (
          <ul className="space-y-2 text-sm text-muted-foreground">
            {Object.values(cart).map(({ item, quantity, type }) => (
              <li key={`${item.id}-${type}`} className="flex justify-between">
                <span>{quantity}x {type === 'rental' ? t_products(item.name as any) : item.name}</span>
                <span>R$ {(item.price * quantity).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Consumo</span>
            <span>R$ {menuTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Aluguel</span>
            <span className={cn(isFeeWaived && "line-through")}>R$ {rentalTotal.toFixed(2)}</span>
          </div>
          {isFeeWaived && (
            <div className="flex justify-between text-sm font-semibold text-primary">
              <span>Isenção de Aluguel</span>
              <span>- R$ {rentalTotal.toFixed(2)}</span>
            </div>
          )}
          {user && user.outstandingBalance && user.outstandingBalance > 0 && (
            <div className="flex justify-between text-sm font-semibold text-destructive">
              <span>Taxa pendente</span>
              <span>R$ {user.outstandingBalance.toFixed(2)}</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-4">
        <div className="flex justify-between items-baseline">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">R$ {finalTotal.toFixed(2)}</p>
        </div>
        
        {hasActiveReservation ? (
          <div className="p-3 bg-destructive/10 rounded-md text-center text-sm text-destructive-foreground">
            <AlertTriangle className="mx-auto mb-2 h-5 w-5 text-destructive" />
            <p className="font-semibold">Você já tem uma reserva ativa.</p>
            <p>Finalize sua reserva atual para poder criar uma nova.</p>
            <Button asChild variant="link" className="text-destructive p-0 h-auto mt-1">
              <Link href="/dashboard/my-reservations">Ver Minhas Reservas</Link>
            </Button>
          </div>
        ) : isOwnerViewingOwnTent ? (
          <div className="p-3 bg-muted rounded-md text-center text-sm text-muted-foreground">
            <Info className="mx-auto mb-2 h-5 w-5" />
            <p className="font-semibold">Esta é a sua barraca.</p>
            <p>Você não pode fazer uma reserva na sua própria barraca.</p>
            <Button asChild variant="link" className="text-primary p-0 h-auto mt-1">
              <Link href="/dashboard">Ir para o Painel</Link>
            </Button>
          </div>
        ) : activeTab === 'reserve' ? (
          <Button size="lg" className="w-full" onClick={handleProceedToMenu} disabled={!hasRentalKitInCart || isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : <>Próximo Passo <ArrowRight className="ml-2" /></>}
          </Button>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="lg" className="w-full" disabled={!hasRentalKitInCart || isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin" /> : <>Fazer Reserva <ShoppingCart className="ml-2" /></>}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Reserva</AlertDialogTitle>
                <AlertDialogDescription>
                  Você está prestes a confirmar a sua reserva no valor de R$ {finalTotal.toFixed(2)}. Deseja continuar?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Voltar</AlertDialogCancel>
                <AlertDialogAction onClick={handleCreateReservation}>
                  Confirmar Reserva
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardFooter>
    </Card>
  );
}
