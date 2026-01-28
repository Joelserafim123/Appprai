'use client';

import { create } from 'zustand';
import type { MenuItem, RentalItem } from '@/lib/types';

type CartItem = {
  item: MenuItem | RentalItem;
  quantity: number;
  type: 'menu' | 'rental';
};

interface CartState {
  cart: Record<string, CartItem>;
  handleQuantityChange: (
    item: MenuItem | RentalItem,
    type: 'menu' | 'rental',
    change: number
  ) => void;
  clearCart: () => void;
  initializeCart: (rentalKit: RentalItem | undefined, isOwner: boolean) => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: {},
  initializeCart: (rentalKit, isOwner) => {
    set(() => {
      if (isOwner || !rentalKit || rentalKit.quantity === 0) {
        return { cart: {} };
      }
      // Only initialize if the cart is currently empty
      if (Object.keys(get().cart).length === 0) {
        return { cart: { [rentalKit.id]: { item: rentalKit, quantity: 1, type: 'rental' } } };
      }
      return {}; // No change
    });
  },
  handleQuantityChange: (item, type, change) => {
    set((state) => {
      const newCart = { ...state.cart };
      const existing = newCart[item.id] || { item, quantity: 0, type };
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
        delete newCart[item.id];
        // If the main kit is removed, also remove additional chairs.
        if (type === 'rental' && (item as RentalItem).name === 'Kit Guarda-sol + 2 Cadeiras') {
          for (const key in newCart) {
            if (newCart[key]?.item.name === 'Cadeira Adicional') {
              delete newCart[key];
            }
          }
        }
      } else {
        newCart[item.id] = { ...existing, quantity: newQuantity };
      }

      return { cart: newCart };
    });
  },
  clearCart: () => {
    set({ cart: {} });
  },
}));
