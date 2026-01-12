import type { Timestamp } from 'firebase/firestore';

export interface Tent {
  id: string;
  slug: string;
  name: string;
  description: string;
  beachName: string;
  ownerId: string;
  location: {
    latitude: number;
    longitude: number;
  };
  minimumOrderForFeeWaiver?: number;
  media?: TentMedia[];
}

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    cpf: string;
    address: string;
    photoURL?: string;
    role: 'customer' | 'owner';
}

export interface TentMedia {
  id: string;
  mediaUrl: string;
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
  name: string;
  price: number;
  quantity: number;
}

export interface Reservation {
  id: string;
  userId: string;
  tentId: string;
  tentName: string;
  items: {
    itemId: string;
    name: string;
    price: number;
    quantity: number;
  }[];
  total: number;
  createdAt: Timestamp;
  status: 'confirmed' | 'cancelled' | 'completed';
}

export interface Chat {
    id: string;
    userId: string;
    userName: string;
    userPhotoURL: string;
    tentId: string;
    tentName: string;
    tentLogoUrl: string;
    tentOwnerId: string;
    lastMessage: string;
    lastMessageTimestamp: Timestamp;
}

export interface ChatMessage {
    id: string;
    senderId: string;
    text: string;
    timestamp: Timestamp;
}
