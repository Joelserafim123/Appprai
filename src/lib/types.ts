

import type { Timestamp } from 'firebase/firestore';

export interface OperatingHoursDay {
  isOpen: boolean;
  open: string;
  close: string;
}

export interface OperatingHours {
  monday: OperatingHoursDay;
  tuesday: OperatingHoursDay;
  wednesday: OperatingHoursDay;
  thursday: OperatingHoursDay;
  friday: OperatingHoursDay;
  saturday: OperatingHoursDay;
  sunday: OperatingHoursDay;
}


export interface Tent {
  id: string;
  slug: string;
  name: string;
  description: string;
  beachName: string;
  ownerId: string;
  ownerName: string;
  logoUrl?: string;
  location: {
    latitude: number;
    longitude: number;
  };
  minimumOrderForFeeWaiver?: number;
  hasAvailableKits?: boolean;
  operatingHours?: OperatingHours;
  distance?: number;
}

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    role: 'customer' | 'owner';
    cpf?: string;
    cep?: string;
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
}

export interface TentMedia {
  id: string;
  mediaUrl: string;
  storagePath: string;
  mediaHint?: string;
  description?: string;
  type: 'image' | 'video';
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'Bebidas' | 'Petiscos' | 'Pratos Principais';
}

export interface RentalItem {
  id: string;
  name: 'Kit Guarda-sol + 2 Cadeiras' | 'Cadeira Adicional';
  price: number;
  quantity: number;
}

export type ReservationItemStatus = 'pending' | 'confirmed' | 'cancelled';

export interface ReservationItem {
    itemId: string;
    name: string;
    price: number;
    quantity: number;
    status: ReservationItemStatus;
};

export type ReservationStatus = 'confirmed' | 'checked-in' | 'payment-pending' | 'completed' | 'cancelled';
export type PaymentMethod = 'card' | 'cash' | 'pix';


export interface Reservation {
  id: string;
  userId: string;
  userName: string;
  tentId: string;
  tentName: string;
  tentOwnerId: string;
  tentOwnerName: string;
  tentLocation: {
    latitude: number;
    longitude: number;
  };
  tableNumber?: number;
  items: ReservationItem[];
  total: number;
  createdAt: Timestamp;
  reservationTime: string;
  checkinCode: string;
  status: ReservationStatus;
  paymentMethod?: PaymentMethod;
}
