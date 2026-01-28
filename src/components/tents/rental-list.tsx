'use client';

import { useCartStore } from '@/hooks/use-cart-store';
import type { RentalItem } from '@/lib/types';
import { Armchair, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useTranslations } from '@/i18n';

interface RentalListProps {
  rentalKit?: RentalItem;
  additionalChair?: RentalItem;
  isSubmitting: boolean;
}

export function RentalList({ rentalKit, additionalChair, isSubmitting }: RentalListProps) {
  const cart = useCartStore((state) => state.cart);
  const handleQuantityChange = useCartStore((state) => state.handleQuantityChange);
  const t_products = useTranslations('Shared.ProductNames');

  if (!rentalKit && !additionalChair) {
    return <p className="text-muted-foreground text-center">Nenhum item de aluguel disponível no momento.</p>;
  }

  const hasRentalKitInCart = rentalKit && cart[rentalKit.id] && cart[rentalKit.id].quantity > 0;

  return (
    <div className='space-y-4'>
      {rentalKit && (
        <div className="flex flex-col rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <Armchair className="h-5 w-5"/>
              {t_products('Kit Guarda-sol + 2 Cadeiras')}
            </h3>
            <p className="text-sm text-muted-foreground">Disponível: {rentalKit.quantity - (cart[rentalKit.id]?.quantity || 0)}</p>
            <p className="text-2xl font-bold text-primary">R$ {rentalKit.price.toFixed(2)}</p>
          </div>
          <div className="mt-4 flex items-center gap-2 sm:mt-0">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange(rentalKit, 'rental', -1)} disabled={isSubmitting}><Minus className="h-4 w-4"/></Button>
            <Input type="number" readOnly value={cart[rentalKit.id]?.quantity || 0} className="h-8 w-16 text-center" disabled={isSubmitting}/>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange(rentalKit, 'rental', 1)} disabled={isSubmitting || (cart[rentalKit.id]?.quantity || 0) >= rentalKit.quantity || (cart[rentalKit.id]?.quantity || 0) >= 3}><Plus className="h-4 w-4"/></Button>
          </div>
        </div>
      )}
      {additionalChair && (
        <div className={cn("flex flex-col rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between transition-opacity", !hasRentalKitInCart && "opacity-50 pointer-events-none")}>
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <Armchair className="h-5 w-5"/>
              {t_products('Cadeira Adicional')}
            </h3>
            <p className="text-sm text-muted-foreground">Disponível: {additionalChair.quantity - (cart[additionalChair.id]?.quantity || 0)}</p>
            <p className="text-xl font-bold text-primary">R$ {additionalChair.price.toFixed(2)}</p>
          </div>
          <div className="mt-4 flex items-center gap-2 sm:mt-0">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange(additionalChair, 'rental', -1)} disabled={isSubmitting || !hasRentalKitInCart}><Minus className="h-4 w-4"/></Button>
            <Input type="number" readOnly value={cart[additionalChair.id]?.quantity || 0} className="h-8 w-16 text-center" disabled={isSubmitting || !hasRentalKitInCart}/>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange(additionalChair, 'rental', 1)} disabled={isSubmitting || !hasRentalKitInCart || (cart[additionalChair.id]?.quantity || 0) >= additionalChair.quantity || (cart[additionalChair.id]?.quantity || 0) >= 3}><Plus className="h-4 w-4"/></Button>
          </div>
        </div>
      )}
    </div>
  );
}
