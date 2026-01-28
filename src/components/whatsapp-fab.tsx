'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { X } from 'lucide-react';

const WhatsAppIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-8 w-8"
    >
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.35 3.43 16.84L2.05 22L7.31 20.62C8.75 21.41 10.36 21.82 12.04 21.82C17.5 21.82 21.95 17.37 21.95 11.91C21.95 6.45 17.5 2 12.04 2M12.04 20.13C10.56 20.13 9.12 19.72 7.89 19L7.47 18.75L4.5 19.5L5.27 16.61L5.03 16.19C4.18 14.88 3.73 13.42 3.73 11.91C3.73 7.36 7.45 3.64 12.04 3.64C16.63 3.64 20.35 7.36 20.35 11.91C20.35 16.46 16.63 20.13 12.04 20.13M17.48 14.51C17.29 14.93 16.33 15.46 15.82 15.58C15.31 15.7 14.68 15.68 14.31 15.42C13.94 15.16 13.11 14.83 12.1 13.93C10.88 12.83 10.15 11.53 9.94 11.23C9.73 10.93 9.59 10.74 9.41 10.45C9.23 10.16 9.09 10 8.95 9.85C8.81 9.7 8.65 9.56 8.5 9.41C8.35 9.26 8.2 9.12 8.07 8.97C7.94 8.82 7.78 8.68 7.64 8.53C7.5 8.38 7.42 8.28 7.34 8.18C7.26 8.08 7.18 7.98 7.1 7.88C7.02 7.78 6.94 7.68 6.87 7.58C6.67 7.32 6.47 7.06 6.51 6.64C6.55 6.22 6.96 5.86 7.24 5.6C7.38 5.48 7.5 5.4 7.66 5.4C7.79 5.4 7.91 5.4 8.01 5.4C8.16 5.41 8.28 5.43 8.39 5.68C8.5 5.93 8.79 6.6 8.87 6.74C8.95 6.88 9.03 7.02 9.07 7.08C9.11 7.14 9.15 7.21 9.15 7.29C9.15 7.37 9.15 7.45 9.11 7.54C9.07 7.63 9.05 7.67 8.97 7.77C8.89 7.87 8.79 7.99 8.69 8.09C8.61 8.17 8.53 8.25 8.47 8.31C8.35 8.43 8.23 8.55 8.25 8.69C8.27 8.83 8.41 8.99 8.55 9.13C8.69 9.27 8.82 9.41 8.95 9.54C9.13 9.72 9.3 9.9 9.53 10.15C9.79 10.43 10.1 10.76 10.45 11.09C10.89 11.51 11.41 11.83 11.95 12.04C12.15 12.12 12.3 12.18 12.44 12.18C12.58 12.18 12.72 12.14 12.86 12.04C13.06 11.91 13.25 11.66 13.47 11.4C13.61 11.23 13.78 11.19 13.96 11.19C14.14 11.19 14.33 11.23 14.5 11.39C14.71 11.56 15.26 12.11 15.42 12.28C15.58 12.45 15.7 12.57 15.76 12.67C15.82 12.77 15.86 12.91 15.82 13.05C15.78 13.19 15.74 13.29 15.7 13.35C15.66 13.41 15.46 13.62 15.26 13.82C15.06 14.02 14.86 14.22 14.73 14.33C14.6 14.44 14.48 14.53 14.59 14.69C14.7 14.85 15.02 15.01 15.18 15.13C15.34 15.25 15.6 15.37 15.82 15.37C16.04 15.37 16.33 15.27 16.53 15.17C16.89 14.98 17.21 14.68 17.31 14.57C17.41 14.46 17.48 14.39 17.48 14.51Z" />
    </svg>
);

export function WhatsAppFab() {
  const phoneNumber = '+5581985519813';
  const whatsappUrl = `https://wa.me/${phoneNumber.replace(/\D/g, '')}`;
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
       <Button
        variant="ghost"
        size="icon"
        className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-destructive text-destructive-foreground shadow-lg hover:bg-destructive/90"
        onClick={() => setIsVisible(false)}
        aria-label="Remover botão do WhatsApp"
      >
        <X className="h-5 w-5" />
      </Button>
      <Button
        asChild
        className="h-16 w-16 rounded-full bg-green-500 text-white shadow-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        aria-label="Contact via WhatsApp"
      >
        <Link href={whatsappUrl} target="_blank" rel="noopener noreferrer">
          <WhatsAppIcon />
        </Link>
      </Button>
    </div>
  );
}
