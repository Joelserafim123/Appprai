import type { ImagePlaceholder } from './placeholder-images';
import { PlaceHolderImages } from './placeholder-images';

const images = PlaceHolderImages.reduce((acc, img) => {
  acc[img.id] = img;
  return acc;
}, {} as Record<string, ImagePlaceholder>);

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'Drinks' | 'Appetizers' | 'Main Courses';
}

export interface RentalItem {
  id: string;
  name: string;
  price: number;
}

export interface Tent {
  id: string;
  slug: string;
  name: string;
  description: string;
  images: ImagePlaceholder[];
  location: { lat: number; lng: number };
  menu: MenuItem[];
  rentals: RentalItem[];
}

const tents: Tent[] = [
  {
    id: '1',
    slug: 'barraca-do-sol',
    name: 'Barraca do Sol',
    description: 'A melhor barraca da praia, com cerveja gelada e peixe fresco. Venha aproveitar o sol conosco!',
    images: [images['tent-1-gallery-1'], images['tent-1-gallery-2'], images['tent-1-gallery-3']],
    location: { lat: -22.9845, lng: -43.2040 },
    rentals: [
      { id: 'r1', name: 'Guarda-sol', price: 15.00 },
      { id: 'r2', name: 'Cadeira', price: 10.00 },
      { id: 'r3', name: 'Kit (1 Guarda-sol + 2 Cadeiras)', price: 30.00 },
    ],
    menu: [
      { id: 'm1', name: 'Água de Coco', description: 'Geladinha e natural.', price: 8.00, category: 'Drinks' },
      { id: 'm2', name: 'Caipirinha', description: 'A clássica caipirinha de limão.', price: 15.00, category: 'Drinks' },
      { id: 'm3', name: 'Isca de Peixe', description: 'Porção generosa de peixe frito.', price: 45.00, category: 'Appetizers' },
      { id: 'm4', name: 'Moqueca de Camarão', description: 'Acompanha arroz e pirão.', price: 95.00, category: 'Main Courses' },
    ],
  },
  {
    id: '2',
    slug: 'recanto-da-onda',
    name: 'Recanto da Onda',
    description: 'Música ao vivo e os melhores petiscos. O seu ponto de encontro na praia.',
    images: [images['tent-2-gallery-1'], images['tent-2-gallery-2']],
    location: { lat: -22.9865, lng: -43.2080 },
    rentals: [
      { id: 'r1', name: 'Guarda-sol', price: 20.00 },
      { id: 'r2', name: 'Cadeira', price: 12.00 },
      { id: 'r3', name: 'Kit (1 Guarda-sol + 2 Cadeiras)', price: 40.00 },
    ],
    menu: [
      { id: 'm5', name: 'Cerveja (Garrafa 600ml)', description: 'Sempre estupidamente gelada.', price: 12.00, category: 'Drinks' },
      { id: 'm6', name: 'Batata Frita', description: 'Com queijo e bacon.', price: 30.00, category: 'Appetizers' },
      { id: 'm7', name: 'Camarão Alho e Óleo', description: 'Porção de camarão salteado.', price: 55.00, category: 'Appetizers' },
      { id: 'm8', name: 'Peixe na Telha', description: 'Peixe assado com legumes.', price: 80.00, category: 'Main Courses' },
    ],
  },
  {
    id: '3',
    slug: 'paraiso-tropical',
    name: 'Paraíso Tropical',
    description: 'Ambiente familiar e comida caseira. Sua casa na praia.',
    images: [images['tent-3-gallery-1']],
    location: { lat: -22.9885, lng: -43.2120 },
     rentals: [
      { id: 'r1', name: 'Guarda-sol', price: 18.00 },
      { id: 'r2', name: 'Cadeira', price: 10.00 },
      { id: 'r3', name: 'Kit (1 Guarda-sol + 2 Cadeiras)', price: 35.00 },
    ],
    menu: [
        { id: 'm9', name: 'Suco Natural', description: 'Laranja, abacaxi ou morango.', price: 10.00, category: 'Drinks' },
        { id: 'm10', name: 'Pastel de Queijo', description: 'Porção com 6 unidades.', price: 25.00, category: 'Appetizers' },
        { id: 'm11', name: 'Picanha na Chapa', description: 'Com fritas, arroz e farofa.', price: 120.00, category: 'Main Courses' },
    ],
  },
];

export function getTents(): Tent[] {
  return tents;
}

export function getTentBySlug(slug: string): Tent | undefined {
  return tents.find((tent) => tent.slug === slug);
}

export function getMapBackground() {
  return images['map-background'];
}
