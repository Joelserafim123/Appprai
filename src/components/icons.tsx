import { Sun } from 'lucide-react';
import type { SVGProps } from 'react';

export function Logo({ userName, ...props }: SVGProps<SVGSVGElement> & { userName?: string }) {
  return (
    <div className="flex items-center gap-2" {...props}>
      <div className="p-2 bg-primary/20 text-primary rounded-lg">
        <Sun className="h-5 w-5" />
      </div>
      <span className="text-xl font-bold text-primary-foreground tracking-tight">
        {userName ? `Olá, ${userName}` : 'BeachPal'}
      </span>
    </div>
  );
}
