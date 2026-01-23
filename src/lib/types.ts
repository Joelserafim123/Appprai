import type { Timestamp } from 'firebase/firestore';

// Base User profile structure
export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    role: 'customer' | 'owner';
    photoURL?: string;
    cpf?: string;
    cep?: string;
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    profileComplete?: boolean;
    outstandingBalance?: number;
}

// Full user data including Firebase User properties
export interface UserData extends UserProfile {
    isAnonymous?: boolean;
}

// Operating hours for a single day
export interface OperatingHoursDay {
  isOpen: boolean;
  open: string;
  close: string;
}

// Operating hours for the whole week
export interface OperatingHours {
  [key: string]: OperatingHoursDay;
}

// Represents a beach tent
export interface Tent {
  id: string;
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
  operatingHours: OperatingHours;
  // Client-side computed value
  distance?: number;
}

// An item on the tent's food/drink menu
export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'Bebidas' | 'Petiscos' | 'Pratos Principais';
}

// A rentable item (e.g., umbrella kit)
export interface RentalItem {
  id: string;
  name: 'Kit Guarda-sol + 2 Cadeiras' | 'Cadeira Adicional';
  price: number;
  quantity: number;
}

// An item within a reservation (can be menu or rental)
export interface ReservationItem {
    itemId: string;
    name: string;
    price: number;
    quantity: number;
};

// Overall status of a reservation
export type ReservationStatus = 'confirmed' | 'checked-in' | 'payment-pending' | 'completed' | 'cancelled';
export type PaymentMethod = 'card' | 'cash' | 'pix';

// Represents a reservation
export interface Reservation {
  id: string;
  userId: string;
  userName: string;
  userPhotoURL?: string;
  tentId: string;
  tentName: string;
  tentLogoUrl?: string;
  tentOwnerId: string;
  tentOwnerName: string;
  tentLocation?: {
    latitude: number;
    longitude: number;
  };
  items: ReservationItem[];
  total: number;
  createdAt: Timestamp;
  reservationTime: string;
  orderNumber: string;
  checkinCode: string;
  status: ReservationStatus;
  paymentMethod?: PaymentMethod;
  platformFee?: number;
  cancellationFee?: number;
  cancellationReason?: string;
  outstandingBalancePaid?: number;
  tableNumber?: number;
  participantIds: string[];
}

// Metadata for a chat conversation
export interface Chat {
  id: string;
  userId: string;
  userName: string;
  userPhotoURL?: string;
  tentId: string;
  tentName: string;
  tentOwnerId: string;
  tentLogoUrl?: string;
  lastMessage?: string;
  lastMessageTimestamp: Timestamp;
  participantIds: string[];
}

// A single message within a chat
export interface ChatMessage {
    id: string;
    senderId: string;
    text: string;
    timestamp: Timestamp;
}
