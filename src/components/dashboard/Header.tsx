import { Leaf } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-primary text-primary-foreground shadow-lg">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center">
        <Leaf className="h-8 w-8 mr-3" />
        <h1 className="text-2xl font-bold tracking-tight">AgriVision Dashboard</h1>
      </div>
    </header>
  );
}
