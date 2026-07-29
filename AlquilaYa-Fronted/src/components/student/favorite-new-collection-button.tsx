'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useFavoriteCollectionsStore } from '@/stores/favorite-collections-store';

/**
 * Chip "+ Nueva colección" de la barra de filtros de favoritos (ítem 231).
 * Solo crea la etiqueta libre — el usuario la asigna a favoritos concretos
 * después, desde `FavoriteCollectionsMenu` en cada card.
 */
export function FavoriteNewCollectionButton() {
  const crearColeccion = useFavoriteCollectionsStore((s) => s.crearColeccion);
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState('');

  const crear = () => {
    const limpio = nombre.trim();
    if (!limpio) return;
    crearColeccion(limpio);
    setNombre('');
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
        >
          <Plus className="size-3.5" aria-hidden />
          Nueva colección
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-64 p-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Nueva colección
        </p>
        <div className="flex items-center gap-1.5">
          <Input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                crear();
              }
            }}
            placeholder="Ej. Cerca del gimnasio"
            className="h-8 text-sm"
            maxLength={40}
            autoFocus
          />
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="h-8 w-8 shrink-0"
            disabled={!nombre.trim()}
            onClick={crear}
            aria-label="Crear colección"
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
