import { Loader2 } from 'lucide-react';

// Loading global que se muestra durante streaming de cualquier ruta.
// Las páginas pueden definir su propio `loading.tsx` con un skeleton más
// específico (cards, tables) para mejor UX.
export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="size-8 animate-spin text-primary" aria-label="Cargando" />
    </div>
  );
}
