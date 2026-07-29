'use client';

import { useState, type MouseEvent } from 'react';
import { StickyNote } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/cn';
import { useFavoriteCollectionsStore } from '@/stores/favorite-collections-store';

interface Props {
  propiedadId: string;
  className?: string;
}

const MAX_LARGO = 200;

/**
 * Nota personal corta por favorito (ítem 233). El ícono va relleno cuando ya
 * hay una nota escrita y outline cuando está vacío — igual que `FavoriteButton`
 * distingue el corazón lleno/vacío. Edición en el mismo popover, con guardado
 * al cerrar (no hace falta un botón "Guardar" aparte para algo tan corto).
 */
export function FavoriteNotePopover({ propiedadId, className }: Props) {
  const notaGuardada = useFavoriteCollectionsStore((s) => s.notaDe(propiedadId));
  const setNota = useFavoriteCollectionsStore((s) => s.setNota);

  const [open, setOpen] = useState(false);
  const [borrador, setBorrador] = useState(notaGuardada);

  const tieneNota = notaGuardada.trim().length > 0;
  const stop = (e: MouseEvent) => e.stopPropagation();

  /**
   * Sincroniza el borrador con `onOpenChange`, no con un efecto: al abrir,
   * copia lo guardado (por si cambió en otra pestaña/tras rehidratar
   * mientras estaba cerrado); al cerrar, persiste lo editado. Evitar el
   * efecto es intencional — `react-hooks/set-state-in-effect` es error
   * activo en este proyecto y aquí el setState es una reacción directa al
   * evento de apertura/cierre, no una sincronización en segundo plano.
   */
  const cerrarYGuardar = (siguienteAbierto: boolean) => {
    if (siguienteAbierto) {
      setBorrador(notaGuardada);
    } else {
      setNota(propiedadId, borrador);
    }
    setOpen(siguienteAbierto);
  };

  return (
    <Popover open={open} onOpenChange={cerrarYGuardar}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={stop}
          aria-label={tieneNota ? 'Editar nota' : 'Agregar nota'}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground',
            tieneNota && 'border-primary/40 text-primary',
            className,
          )}
        >
          <StickyNote
            className={cn('size-3.5', tieneNota && 'fill-primary/20')}
            aria-hidden
          />
          {tieneNota ? 'Nota' : 'Agregar nota'}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-72 p-3" onClick={stop}>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Nota personal
        </p>
        <Textarea
          value={borrador}
          onChange={(e) => setBorrador(e.target.value.slice(0, MAX_LARGO))}
          placeholder="Ej. me gustó pero el baño es compartido"
          className="min-h-[72px] text-sm"
          autoFocus
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            {borrador.length}/{MAX_LARGO}
          </span>
          <Button type="button" size="sm" onClick={() => cerrarYGuardar(false)}>
            Guardar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
