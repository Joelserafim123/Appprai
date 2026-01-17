import type { Tent, MenuItem, RentalItem } from './types';

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
