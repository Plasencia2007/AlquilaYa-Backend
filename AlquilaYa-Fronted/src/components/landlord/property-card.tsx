import { Badge } from '@/components/ui/legacy-badge';
import { Card } from '@/components/ui/legacy-card';
import { Button } from '@/components/ui/legacy-button';

interface PropertyCardProps {
  titulo: string;
  precio: number;
  direccion: string;
  estado: string;
  imagenUrl?: string;
}

export const PropertyCard = ({ titulo, precio, direccion, estado, imagenUrl }: PropertyCardProps) => {
  // Traducir estados para el usuario
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDIENTE': return <Badge variant="surface" className="bg-amber-100 text-amber-700 border-amber-200">En revisión</Badge>;
      case 'ACTIVA': return <Badge variant="surface" className="bg-emerald-100 text-emerald-700 border-emerald-200">Publicada</Badge>;
      default: return <Badge variant="surface">{status}</Badge>;
    }
  };

  return (
    <Card padding="none" className="group overflow-hidden border-none shadow-sm hover:shadow-xl transition-all duration-500 bg-surface-container-low hover:-translate-y-1">
      <div className="relative aspect-[16/10] overflow-hidden">
        {imagenUrl ? (
          <img 
            src={imagenUrl} 
            alt={titulo} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full bg-surface-variant/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/30">image</span>
          </div>
        )}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {getStatusBadge(estado)}
        </div>
        <div className="absolute top-3 right-3">
          <div className="bg-surface/90 backdrop-blur-md px-3 py-1.5 rounded-full text-primary font-black text-sm shadow-lg">
            S/ {precio.toLocaleString()}
          </div>
        </div>
      </div>
      
      <div className="p-5">
        <h3 className="font-black text-lg text-on-surface tracking-tight mb-1 line-clamp-1 group-hover:text-primary transition-colors">
          {titulo}
        </h3>
        <div className="flex items-center gap-1.5 text-on-surface-variant text-sm mb-4">
          <span className="material-symbols-outlined text-base">location_on</span>
          <span className="line-clamp-1">{direccion}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" size="sm" className="w-full rounded-xl border border-surface-variant text-xs h-9">
            <span className="material-symbols-outlined text-base mr-2">edit</span>
            Editar
          </Button>
          <Button variant="ghost" size="sm" className="w-full rounded-xl border border-surface-variant text-xs h-9 text-error hover:bg-error/10 hover:text-error border-transparent">
            <span className="material-symbols-outlined text-base mr-2">visibility_off</span>
            Pausar
          </Button>
        </div>
      </div>
    </Card>
  );
};
