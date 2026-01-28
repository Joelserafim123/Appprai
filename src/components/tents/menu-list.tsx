'use client';

import { useCartStore } from '@/hooks/use-cart-store';
import type { MenuItem } from '@/lib/types';
import { Loader2, Minus, Plus, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useTranslations } from '@/i18n';

interface MenuListProps {
  menuItems?: MenuItem[];
  isLoading: boolean;
  isSubmitting: boolean;
}

export function MenuList({ menuItems, isLoading, isSubmitting }: MenuListProps) {
  const cart = useCartStore((state) => state.cart);
  const handleQuantityChange = useCartStore((state) => state.handleQuantityChange);
  const t_categories = useTranslations('Shared.Categories');

  if (isLoading) {
    return <Loader2 className="mx-auto my-8 h-8 w-8 animate-spin text-primary" />;
  }

  if (!menuItems || menuItems.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <Utensils className="mx-auto h-10 w-10" />
        <h3 className="mt-4 text-lg font-semibold text-card-foreground">Cardápio Indisponível</h3>
        <p className="mt-1 text-sm">Esta barraca ainda não cadastrou itens no cardápio.</p>
      </div>
    );
  }

  const menuByCategory = (menuItems || []).reduce((acc, item) => {
    const category = item.category || 'Outros';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  return (
    <Accordion type="multiple" defaultValue={Object.keys(menuByCategory)} className="w-full mt-6">
      {Object.entries(menuByCategory).map(([category, items]) => (
        <AccordionItem key={category} value={category}>
          <AccordionTrigger className="text-lg font-semibold">{t_categories(category as any)}</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                    <p className="text-sm font-bold text-primary">R$ {item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange(item, 'menu', -1)} disabled={isSubmitting}><Minus className="h-4 w-4"/></Button>
                    <Input type="number" readOnly value={cart[item.id]?.quantity || 0} className="h-8 w-12 text-center" disabled={isSubmitting}/>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange(item, 'menu', 1)} disabled={isSubmitting}><Plus className="h-4 w-4"/></Button>
                  </div>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
