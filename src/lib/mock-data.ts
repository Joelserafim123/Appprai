import type { Tent, MenuItem, RentalItem, Reservation, Chat, ChatMessage } from './types';

// This is a mock Timestamp that is compatible with what the app expects.
const createMockTimestamp = (date: Date) => ({
  toDate: () => date,
  toMillis: () => date.getTime(),
  seconds: Math.floor(date.getTime() / 1000),
  nanoseconds: (date.getTime() % 1000) * 1000000,
});

export const mockTents: Tent[] = [
  {
    id: '1',
    slug: 'barraca-do-sol',
    name: 'Barraca do Sol',
    description: 'A melhor barraca da Praia do Futuro, com a cerveja mais gelada e os melhores petiscos. Venha conferir!',
    beachName: 'Praia do Futuro',
    ownerId: 'owner1',
    ownerName: 'Seu João',
    hasAvailableKits: true,
    location: { latitude: -3.7318, longitude: -38.4891 },
    minimumOrderForFeeWaiver: 50,
  },
  {
    id: '2',
    slug: 'barraca-estrela-do-mar',
    name: 'Barraca Estrela do Mar',
    description: 'Ambiente familiar e comida de qualidade. A sua melhor opção em Iracema.',
    beachName: 'Praia de Iracema',
    ownerId: 'owner2',
    ownerName: 'Dona Maria',
    hasAvailableKits: false,
    location: { latitude: -3.718, longitude: -38.513 },
  },
  {
    id: '3',
    slug: 'onda-tropical',
    name: 'Onda Tropical',
    description: 'Música ao vivo, gente bonita e drinks tropicais. A barraca mais badalada de Canoa Quebrada.',
    beachName: 'Canoa Quebrada',
    ownerId: 'owner3',
    ownerName: 'Carlos',
    hasAvailableKits: true,
    location: { latitude: -4.524, longitude: -37.697 },
    minimumOrderForFeeWaiver: 70,
  }
];

export const mockMenuItems: MenuItem[] = [
    { id: 'm1', name: 'Água de Coco', description: 'Gelada e natural.', price: 5.00, category: 'Bebidas' },
    { id: 'm2', name: 'Cerveja Long Neck', description: 'Heineken, Stella Artois, Budweiser.', price: 8.00, category: 'Bebidas' },
    { id: 'm3', name: 'Batata Frita', description: 'Porção generosa com cheddar e bacon.', price: 25.00, category: 'Petiscos' },
    { id: 'm4', name: 'Isca de Peixe', description: 'Peixe fresco empanado e frito, com molho da casa.', price: 45.00, category: 'Petiscos' },
    { id: 'm5', name: 'Peixe na Telha', description: 'Delicioso peixe assado com legumes, serve 2 pessoas.', price: 90.00, category: 'Pratos Principais' },
];

export const mockRentalItems: RentalItem[] = [
    { id: 'r1', name: 'Kit Guarda-sol + 2 Cadeiras', price: 30.00, quantity: 10 },
    { id: 'r2', name: 'Cadeira Adicional', price: 10.00, quantity: 20 },
];

export const mockReservations: Reservation[] = [
    {
        id: 'res1',
        userId: 'customer1',
        userName: 'João da Silva',
        tentId: '1',
        tentName: 'Barraca do Sol',
        tentOwnerId: 'owner1',
        tentOwnerName: 'Seu João',
        tentLocation: { latitude: -3.7318, longitude: -38.4891 },
        items: [
            { itemId: 'r1', name: 'Kit Guarda-sol + 2 Cadeiras', price: 30.00, quantity: 1, status: 'confirmed' },
            { itemId: 'm3', name: 'Batata Frita', price: 25.00, quantity: 1, status: 'confirmed' },
            { itemId: 'm2', name: 'Cerveja Long Neck', price: 8.00, quantity: 4, status: 'confirmed' },
        ],
        total: 87.00,
        createdAt: createMockTimestamp(new Date(new Date().setDate(new Date().getDate() - 5))) as any,
        reservationTime: '10:00',
        orderNumber: '123456',
        checkinCode: '1111',
        status: 'completed',
        paymentMethod: 'card',
        participantIds: ['customer1', 'owner1'],
    },
    {
        id: 'res2',
        userId: 'customer1',
        userName: 'João da Silva',
        tentId: '3',
        tentName: 'Onda Tropical',
        tentOwnerId: 'owner3',
        tentOwnerName: 'Carlos',
        tentLocation: { latitude: -4.524, longitude: -37.697 },
        items: [
            { itemId: 'r1', name: 'Kit Guarda-sol + 2 Cadeiras', price: 30.00, quantity: 1, status: 'confirmed' },
            { itemId: 'm1', name: 'Água de Coco', price: 5.00, quantity: 2, status: 'confirmed' },
            { itemId: 'item-pending-1', name: 'Caipirinha', price: 15, quantity: 2, status: 'pending' },
        ],
        total: 40.00,
        createdAt: createMockTimestamp(new Date(new Date().setDate(new Date().getDate() - 2))) as any,
        reservationTime: '11:30',
        orderNumber: '654321',
        checkinCode: '2222',
        status: 'checked-in',
        participantIds: ['customer1', 'owner3'],
    },
    {
        id: 'res3',
        userId: 'customer2',
        userName: 'Maria Oliveira',
        tentId: '1',
        tentName: 'Barraca do Sol',
        tentOwnerId: 'owner1',
        tentOwnerName: 'Seu João',
        tentLocation: { latitude: -3.7318, longitude: -38.4891 },
        items: [
            { itemId: 'r1', name: 'Kit Guarda-sol + 2 Cadeiras', price: 30.00, quantity: 1, status: 'confirmed' },
        ],
        total: 30.00,
        createdAt: createMockTimestamp(new Date()) as any,
        reservationTime: '09:00',
        orderNumber: '789012',
        checkinCode: '3333',
        status: 'confirmed',
        participantIds: ['customer2', 'owner1'],
    },
    {
        id: 'res4',
        userId: 'customer2',
        userName: 'Maria Oliveira',
        tentId: '1',
        tentName: 'Barraca do Sol',
        tentOwnerId: 'owner1',
        tentOwnerName: 'Seu João',
        tentLocation: { latitude: -3.7318, longitude: -38.4891 },
        items: [
            { itemId: 'r1', name: 'Kit Guarda-sol + 2 Cadeiras', price: 30.00, quantity: 1, status: 'confirmed' },
            { itemId: 'm4', name: 'Isca de Peixe', price: 45.00, quantity: 1, status: 'confirmed' },
        ],
        total: 75.00,
        createdAt: createMockTimestamp(new Date(new Date().setDate(new Date().getDate() - 1))) as any,
        reservationTime: '13:00',
        orderNumber: '345678',
        checkinCode: '4444',
        status: 'payment-pending',
        participantIds: ['customer2', 'owner1'],
    },
];


export const mockChats: Chat[] = [
    {
        id: 'chat1',
        userId: 'customer1',
        userName: 'João da Silva',
        userPhotoURL: 'https://i.pravatar.cc/150?u=customer1',
        tentId: '1',
        tentName: 'Barraca do Sol',
        tentOwnerId: 'owner1',
        tentLogoUrl: 'https://i.pravatar.cc/150?u=owner1',
        lastMessage: 'Obrigado!',
        lastMessageTimestamp: createMockTimestamp(new Date(new Date().setHours(new Date().getHours() - 1, 7))) as any,
        participantIds: ['customer1', 'owner1'],
    },
    {
        id: 'chat2',
        userId: 'customer2',
        userName: 'Maria Oliveira',
        userPhotoURL: 'https://i.pravatar.cc/150?u=customer2',
        tentId: '3',
        tentName: 'Onda Tropical',
        tentOwnerId: 'owner3',
        tentLogoUrl: 'https://i.pravatar.cc/150?u=owner3',
        lastMessage: 'Vocês têm cadeira de bebê?',
        lastMessageTimestamp: createMockTimestamp(new Date(new Date().setDate(new Date().getDate() - 1))) as any,
        participantIds: ['customer2', 'owner3'],
    },
];


export const mockMessages: Record<string, ChatMessage[]> = {
    'chat1': [
        { id: 'msg1-1', senderId: 'customer1', text: 'Olá! A minha reserva está confirmada?', timestamp: createMockTimestamp(new Date(new Date().setHours(new Date().getHours() - 1, 5))) as any },
        { id: 'msg1-2', senderId: 'owner1', text: 'Olá João, está confirmada sim! Esperamos por você.', timestamp: createMockTimestamp(new Date(new Date().setHours(new Date().getHours() - 1, 6))) as any },
        { id: 'msg1-3', senderId: 'customer1', text: 'Obrigado!', timestamp: createMockTimestamp(new Date(new Date().setHours(new Date().getHours() - 1, 7))) as any },
    ],
    'chat2': [
         { id: 'msg2-1', senderId: 'customer2', text: 'Vocês têm cadeira de bebê?', timestamp: createMockTimestamp(new Date(new Date().setDate(new Date().getDate() - 1))) as any },
    ]
}