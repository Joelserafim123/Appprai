'use client';

import { create } from 'zustand';
import type { MenuItem, RentalItem } from '@/lib/types';
import { produce } from 'zustand/middleware/immer';

type CartItem = {
  item: MenuItem | RentalItem;
  quantity: number;
  type: 'menu' | 'rental';
};

interface CartState {
  cart: Record<string, CartItem>;
  actions: {
    handleQuantityChange: (
      item: MenuItem | RentalItem,
      type: 'menu' | 'rental',
      change: number
    ) => void;
    clearCart: () => void;
    initializeCart: (rentalKit: RentalItem | undefined, isOwner: boolean) => void;
  };
}

export const useCartStore = create<CartState>()(
  produce((set, get) => ({
    cart: {},
    actions: {
      initializeCart: (rentalKit, isOwner) => {
        if (isOwner || !rentalKit || rentalKit.quantity === 0) {
          set({ cart: {} });
          return;
        }
        // Only initialize if the cart is currently empty
        if (Object.keys(get().cart).length === 0) {
            set({
                cart: {
                    [rentalKit.id]: { item: rentalKit, quantity: 1, type: 'rental' },
                },
            });
        }
      },
      handleQuantityChange: (item, type, change) => {
        set((state) => {
          const existing = state.cart[item.id] || { item, quantity: 0, type };
          let newQuantity = Math.max(0, existing.quantity + change);

          if (type === 'rental') {
            const rentalItem = item as RentalItem;
            if (rentalItem.quantity) {
              newQuantity = Math.min(newQuantity, rentalItem.quantity);
            }
            if (rentalItem.name === 'Kit Guarda-sol + 2 Cadeiras' || rentalItem.name === 'Cadeira Adicional') {
              newQuantity = Math.min(newQuantity, 3);
            }
          }

          if (newQuantity === 0) {
            delete state.cart[item.id];
            // If the main kit is removed, also remove additional chairs.
            if (type === 'rental' && (item as RentalItem).name === 'Kit Guarda-sol + 2 Cadeiras') {
                for (const key in state.cart) {
                    if (state.cart[key]?.item.name === 'Cadeira Adicional') {
                        delete state.cart[key];
                    }
                }
            }
          } else {
            state.cart[item.id] = { ...existing, quantity: newQuantity };
          }
        });
      },
      clearCart: () => {
        set({ cart: {} });
      },
    },
  }))
);

export const useCartActions = () => useCartStore((state) => state.actions);
