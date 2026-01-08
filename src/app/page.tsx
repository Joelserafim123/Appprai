import { Header } from '@/components/layout/header';
import { BeachMap } from '@/components/beach-map';
import { getTents } from '@/lib/placeholder-data';

export default function Home() {
  const tents = getTents();
  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <Header />
      <main className="flex-1 overflow-hidden">
        <BeachMap tents={tents} />
      </main>
    </div>
  );
}
