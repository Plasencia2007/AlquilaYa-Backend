'use client';

import { useState, useRef, type MouseEvent } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import {
  Copy,
  EyeOff,
  GitCompare,
  MessageCircle,
  MoreVertical,
  Share2,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent } from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useHiddenPropertiesStore } from '@/stores/hidden-properties-store';
import { useCompareStore } from '@/stores/compare-store';
import { cn } from '@/lib/cn';

interface Props {
  propiedadId: string;
  titulo: string;
}

/**
 * Detiene la propagación y previene el comportamiento por defecto
 * para que el `<Link>` del card no navegue al activar un item del menú.
 */
function stopCardNavigation(e: MouseEvent | Event) {
  e.preventDefault();
  e.stopPropagation();
}

export function PropertyCardKebabMenu({ propiedadId, titulo }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  // Recordamos el último elemento que abrió el popover para devolverle el foco al cerrar
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const hide = useHiddenPropertiesStore((s) => s.hide);
  const unhide = useHiddenPropertiesStore((s) => s.unhide);

  const compareToggle = useCompareStore((s) => s.toggle);
  const compareHas = useCompareStore((s) => s.selectedIds.includes(propiedadId));
  const canAdd = useCompareStore((s) => s.canAdd());

  const url =
    typeof window !== 'undefined'
      ? `${window.location.origin}/property/${propiedadId}`
      : `/property/${propiedadId}`;

  const handleHide = (e: Event) => {
    stopCardNavigation(e);
    hide(propiedadId);
    toast('Propiedad oculta', {
      duration: 5000,
      action: {
        label: 'Deshacer',
        onClick: () => unhide(propiedadId),
      },
    });
    setMenuOpen(false);
  };

  const handleCompare = (e: Event) => {
    stopCardNavigation(e);
    // Si no se puede agregar y la propiedad NO está ya seleccionada -> el item ya está deshabilitado
    if (!compareHas && !canAdd) return;
    compareToggle(propiedadId);
    setMenuOpen(false);
  };

  const handleShareClick = async (e: Event) => {
    stopCardNavigation(e);

    const canNativeShare =
      typeof navigator !== 'undefined' && typeof navigator.share === 'function';

    if (canNativeShare) {
      try {
        await navigator.share({
          title: titulo,
          text: `Mira esta propiedad cerca de UPeU: ${titulo}`,
          url,
        });
      } catch (err) {
        // El usuario puede cancelar el share nativo -> AbortError. Silenciamos.
        if (
          err instanceof DOMException &&
          (err.name === 'AbortError' || err.name === 'NotAllowedError')
        ) {
          // ignore
        } else {
          // Si por algún motivo Web Share falla -> abrimos el fallback popover
          setShareOpen(true);
          return;
        }
      }
      setMenuOpen(false);
      return;
    }

    // Desktop / sin Web Share -> abrimos popover. Cerramos el menú primero
    // para que Radix mueva el foco fuera del DropdownMenu antes de montar el popover.
    setMenuOpen(false);
    // pequeño delay para evitar conflictos de focus management entre Radix portals
    requestAnimationFrame(() => setShareOpen(true));
  };

  const handleCopyLink = async (e: MouseEvent) => {
    stopCardNavigation(e);
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Enlace copiado');
    } catch {
      toast.error('No se pudo copiar el enlace');
    }
    setShareOpen(false);
  };

  const handleWhatsApp = (e: MouseEvent) => {
    stopCardNavigation(e);
    const text = encodeURIComponent(`${titulo} ${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
    setShareOpen(false);
  };

  const compareDisabled = !compareHas && !canAdd;
  const compareLabel = compareHas ? 'Quitar de comparar' : 'Comparar';

  return (
    <Popover open={shareOpen} onOpenChange={setShareOpen}>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        {/*
          Usamos PopoverAnchor para que el popover se ancle al botón kebab
          sin disputarse el rol de trigger con el DropdownMenu. El Tooltip se
          compone encima con otro `asChild`, todos apuntan al mismo <button>.
        */}
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <PopoverPrimitive.Anchor asChild>
              <DropdownMenuTrigger asChild>
                <TooltipTrigger asChild>
                  <button
                    ref={triggerRef}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    aria-label="Más opciones"
                    className={cn(
                      'flex size-8 items-center justify-center rounded-full',
                      'bg-white/95 backdrop-blur-md shadow-md transition-all',
                      'hover:scale-110 active:scale-95',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    )}
                  >
                    <MoreVertical className="size-4 text-foreground/70" aria-hidden />
                  </button>
                </TooltipTrigger>
              </DropdownMenuTrigger>
            </PopoverPrimitive.Anchor>
            <TooltipContent side="left">Más opciones</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <DropdownMenuContent
          align="end"
          sideOffset={6}
          className="w-52"
          // Evita que clicks dentro del menú lleguen al <Link> del card
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenuItem
            onSelect={handleShareClick}
            className="cursor-pointer"
          >
            <Share2 className="size-4" aria-hidden />
            <span>Compartir</span>
          </DropdownMenuItem>

          <DropdownMenuItem onSelect={handleHide} className="cursor-pointer">
            <EyeOff className="size-4" aria-hidden />
            <span>Ocultar</span>
          </DropdownMenuItem>

          {compareDisabled ? (
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  {/*
                    Radix marca el item como data-disabled (pointer-events:none) -> no recibe hover.
                    Envolvemos en un <span> que sí captura el hover para mostrar el tooltip.
                  */}
                  <span className="block">
                    <DropdownMenuItem
                      disabled
                      onSelect={(e) => e.preventDefault()}
                      className="cursor-not-allowed"
                    >
                      <GitCompare className="size-4" aria-hidden />
                      <span>{compareLabel}</span>
                    </DropdownMenuItem>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="left">
                  Máximo 4 propiedades
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <DropdownMenuItem
              onSelect={handleCompare}
              className="cursor-pointer"
            >
              <GitCompare className="size-4" aria-hidden />
              <span>{compareLabel}</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-56 p-2"
        onClick={(e) => e.stopPropagation()}
        // Devuelve el foco al kebab al cerrar
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          triggerRef.current?.focus();
        }}
      >
        <div className="flex flex-col gap-1">
          <p className="px-2 pb-1 pt-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Compartir
          </p>
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-2 rounded-sm px-2 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:outline-none"
          >
            <Copy className="size-4" aria-hidden />
            <span>Copiar enlace</span>
          </button>
          <button
            type="button"
            onClick={handleWhatsApp}
            className="flex items-center gap-2 rounded-sm px-2 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:outline-none"
          >
            <MessageCircle className="size-4" aria-hidden />
            <span>WhatsApp</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
