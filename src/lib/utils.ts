import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name: string | null | undefined) {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

export function createSlug(name: string): string {
    if (!name) return '';
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove non-word, non-space, non-hyphen characters
      .replace(/[\s_-]+/g, '-') // Replace spaces, underscores, hyphens with a single hyphen
      .replace(/^-+|-+$/g, '');   // Remove leading/trailing hyphens
}
