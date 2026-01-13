
import type { Timestamp } from 'firebase/firestore';

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
}

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
    cpf: string;
    address: string;
    role: 'customer' | 'owner';
}

export interface TentMedia {
  id: string;
  mediaUrl: string; // Public URL from Firebase Storage
  storagePath: string; // Path to the file in Firebase Storage
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
  tentOwnerName: string;
  tentLocation: {
    latitude: number;
    longitude: number;
  };
  tableNumber?: number;
  items: ReservationItem[];
  total: number;
  createdAt: Timestamp;
  status: ReservationStatus;
  paymentMethod?: PaymentMethod;
}


export interface Chat {
  id: string;
  userId: string;
  userName: string;
  userPhotoURL: string;
  tentId: string;
  tentName: string;
  tentOwnerId: string;
  tentLogoUrl: string;
  lastMessage: string;
  lastMessageTimestamp: Timestamp;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: Timestamp;
}
