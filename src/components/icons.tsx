import { Sun } from 'lucide-react';
import type { SVGProps } from 'react';

export function Logo({ ...props }: SVGProps<SVGSVGElement>) {
  return (
    <div className="flex items-center gap-2" {...props}>
      <div className="p-2 bg-primary/20 text-primary rounded-lg">
        <Sun className="h-5 w-5" />
      </div>
      <span className="text-xl font-bold tracking-tight">
        BeachPal
      </span>
    </div>
  );
}
