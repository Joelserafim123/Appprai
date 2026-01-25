import type { Timestamp } from 'firebase/firestore';
import { z } from 'zod';
import { isValidCpf } from './utils';

// Base User profile structure
export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
    role: 'customer' | 'owner';
    cpf?: string;
    cep?: string;
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    profileComplete?: boolean;
    outstandingBalance?: number;
    favoriteTentIds?: string[];
    fcmTokens?: string[];
}

// Full user data including Firebase User properties
export interface UserData extends UserProfile {
    isAnonymous?: boolean;
    emailVerified: boolean;
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
  location: {
    latitude: number;
    longitude: number;
  };
  minimumOrderForFeeWaiver?: number;
  hasAvailableKits?: boolean;
  operatingHours: OperatingHours;
  averageRating: number;
  reviewCount: number;
  // Client-side computed value
  distance?: number;
  bannerUrl?: string;
  logoUrl?: string;
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
  tentOwnerId: string;
  tentOwnerName: string;
  tentLogoUrl?: string;
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
  reviewed?: boolean;
}

// A review of a tent
export interface Review {
  id: string;
  userId: string;
  userName: string;
  userPhotoURL?: string;
  tentId: string;
  reservationId: string;
  rating: number;
  comment: string;
  createdAt: Timestamp;
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
  lastMessageSenderId?: string;
  lastMessageTimestamp: Timestamp;
  participantIds: string[];
}

// A single message within a chat
export interface ChatMessage {
    id: string;
    senderId: string;
    text: string;
    timestamp: Timestamp;
    isRead?: boolean;
}


const operatingHoursSchema = z.object({
  isOpen: z.boolean(),
  open: z.string(),
  close: z.string(),
});

export const tentSchema = z.object({
  name: z.string().min(3, 'O nome da barraca é obrigatório.'),
  description: z.string().min(10, 'A descrição é obrigatória.'),
  beachName: z.string().min(3, 'O nome da praia é obrigatória.'),
  minimumOrderForFeeWaiver: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : parseFloat(String(val))),
    z.number({ invalid_type_error: 'O valor deve ser um número.' }).nullable()
  ),
  location: z.object({
    latitude: z.number({ required_error: 'A localização no mapa é obrigatória.'}),
    longitude: z.number({ required_error: 'A localização no mapa é obrigatória.'}),
  }),
  operatingHours: z.object({
    monday: operatingHoursSchema,
    tuesday: operatingHoursSchema,
    wednesday: operatingHoursSchema,
    thursday: operatingHoursSchema,
    friday: operatingHoursSchema,
    saturday: operatingHoursSchema,
    sunday: operatingHoursSchema,
  }),
});

export const profileSchema = z.object({
  displayName: z.string().min(2, 'O nome completo é obrigatório.'),
  cpf: z.string()
    .min(1, "O CPF é obrigatório.")
    .refine(isValidCpf, { message: "O número do CPF informado é inválido." }),
  cep: z.string().refine(value => !value || /^\d{5}-?\d{3}$/.test(value.replace(/\D/g, '')) , { message: 'CEP inválido. Deve conter 8 números.' }).optional(),
  street: z.string().optional().or(z.literal('')),
  number: z.string().optional().or(z.literal('')),
  neighborhood: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
});


export type TentFormData = z.infer<typeof tentSchema>;
