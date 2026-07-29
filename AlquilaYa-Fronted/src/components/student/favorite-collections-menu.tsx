'use client';

import { useState, type MouseEvent } from 'react';
import { Check, Plus, Tag } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/cn';
import { useFavoriteCollectionsStore } from '@/stores/favorite-collections-store';

interface Props {
  propiedadId: string;
  className?: string;
}

/**
 * Control por-card para asignar/quitar colecciones de un favorito (ítem 231,
 * fase 1 front-only). Popover con checklist de colecciones existentes +
 * mini-formulario para crear una nueva (se asigna al favorito al crearla).
 *
 * Se monta desde `favorites/page.tsx`, NO desde `PropertyCard` — las
 * colecciones son un concepto específico de "Mis favoritos", no de la card
 * genérica que se reusa en búsqueda/home/carruseles.
 */
export function FavoriteCollectionsMenu({ propiedadId, className }: Props) {
  const colecciones = useFavoriteCollectionsStore((s) => s.colecciones);
  const asignadas = useFavoriteCollectionsStore(
    (s) => s.asignaciones[propiedadId] ?? [],
  );
  const toggleColeccion = useFavoriteCollectionsStore((s) => s.toggleColeccion);
  const asignar = useFavoriteCollectionsStore((s) => s.asignar);

  const [open, setOpen] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');

  const stop = (e: MouseEvent) => e.stopPropagation();

  const crearYAsignar = () => {
    const nombre = nuevoNombre.trim();
    if (!nombre) return;
    asignar(propiedadId, nombre);
    setNuevoNombre('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={stop}
          aria-label="Asignar a una colección"
          className={cn(
            'inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground',
            asignadas.length > 0 && 'border-primary/40 text-primary',
            className,
          )}
        >
          <Tag className="size-3.5" aria-hidden />
          {asignadas.length > 0 ? `${asignadas.length} colección${asignadas.length === 1 ? '' : 'es'}` : 'Colección'}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-64 p-3"
        onClick={stop}
      >
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Colecciones
        </p>
        <div className="flex max-h-48 flex-col gap-0.5 overflow-y-auto">
          {colecciones.length === 0 && (
            <p className="px-1 py-1.5 text-sm text-muted-foreground">
              Aún no tienes colecciones.
            </p>
          )}
          {colecciones.map((coleccion) => {
            const checked = asignadas.includes(coleccion);
            return (
              <button
                key={coleccion}
                type="button"
                onClick={() => toggleColeccion(propiedadId, coleccion)}
                className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <span
                  className={cn(
                    'flex size-4 shrink-0 items-center justify-center rounded-sm border border-input',
                    checked && 'border-primary bg-primary text-primary-foreground',
                  )}
                  aria-hidden
                >
                  {checked && <Check className="size-3" />}
                </span>
                <span className="truncate">{coleccion}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-2 flex items-center gap-1.5 border-t border-border pt-2">
          <Input
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                crearYAsignar();
              }
            }}
            placeholder="Nueva colección…"
            className="h-8 text-sm"
            maxLength={40}
          />
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="h-8 w-8 shrink-0"
            disabled={!nuevoNombre.trim()}
            onClick={crearYAsignar}
            aria-label="Crear colección"
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
