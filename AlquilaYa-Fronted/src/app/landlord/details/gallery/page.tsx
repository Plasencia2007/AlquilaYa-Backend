import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function WIPPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
      <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center text-primary mb-6">
        <span className="material-symbols-outlined text-4xl">construction</span>
      </div>
      <Badge variant="surface" className="mb-4">Sección en desarrollo</Badge>
      <h1 className="text-3xl font-black text-on-surface tracking-tighter mb-2">Estamos trabajando en esto</h1>
      <p className="text-on-surface-variant max-w-sm mb-8">Esta sección estará disponible muy pronto para que gestiones tu negocio con mayor eficiencia.</p>
      <Button asChild variant="dark">
        <Link href="/landlord/dashboard">Volver al Resumen</Link>
      </Button>
    </div>
  );
}

