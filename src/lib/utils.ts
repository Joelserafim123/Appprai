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

export function isValidCpf(cpf: string | null | undefined): boolean {
  if (!cpf) return false;

  // Remove non-digit characters
  const cpfDigits = cpf.replace(/\D/g, '');

  // Check if it has 11 digits and if all digits are not the same
  if (cpfDigits.length !== 11 || /^(\d)\1+$/.test(cpfDigits)) {
    return false;
  }

  let sum = 0;
  let remainder;

  // Validate first digit
  for (let i = 1; i <= 9; i++) {
    sum = sum + parseInt(cpfDigits.substring(i - 1, i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) {
    remainder = 0;
  }
  if (remainder !== parseInt(cpfDigits.substring(9, 10))) {
    return false;
  }

  // Validate second digit
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum = sum + parseInt(cpfDigits.substring(i - 1, i)) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) {
    remainder = 0;
  }
  if (remainder !== parseInt(cpfDigits.substring(10, 11))) {
    return false;
  }

  return true;
}
