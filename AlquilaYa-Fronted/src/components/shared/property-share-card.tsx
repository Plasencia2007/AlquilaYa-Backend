'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Home } from 'lucide-react';

import { Money } from '@/components/ui/money';
import { esImagenExterna } from '@/lib/img';
import { servicioPropiedades } from '@/services/property-service';
import type { Propiedad } from '@/types/propiedad';

interface Props {
  propiedadId: string;
}

type Estado = 'cargando' | 'ok' | 'no-encontrada';

/**
 * Ítem 255: mini-card de una propiedad compartida en el chat (detectada por
 * `extraerPropiedadCompartida` sobre el texto del mensaje). Solo frontend: no
 * cambia lo que se guarda en backend, solo cómo se renderiza el link.
 */
export function PropertyShareCard({ propiedadId }: Props) {
  const [propiedad, setPropiedad] = useState<Propiedad | null>(null);
  const [estado, setEstado] = useState<Estado>('cargando');

  useEffect(() => {
    let cancelado = false;
    servicioPropiedades
      .obtenerPorId(propiedadId)
      .then((data) => {
        if (cancelado) return;
        if (data) {
          setPropiedad(data);
          setEstado('ok');
        } else {
          setEstado('no-encontrada');
        }
      })
      .catch(() => {
        if (cancelado) return;
        setEstado('no-encontrada');
      });
    return () => {
      cancelado = true;
    };
  }, [propiedadId]);

  // Ítem no urgente de UX defensiva: si la propiedad ya no existe (borrada,
  // despublicada), no mostramos una card rota — el link plano ya quedó
  // linkificado por Linkify, así que el mensaje sigue siendo clicable.
  if (estado === 'no-encontrada') return null;

  if (estado === 'cargando') {
    return (
      <div className="mt-1.5 flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/60 p-2">
        <div className="size-14 shrink-0 animate-pulse rounded-lg bg-muted" />
        <div className="min-w-0 flex-1 space-y-1.5 py-0.5">
          <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  const foto = propiedad?.imagenes?.[0];

  return (
    <Link
      href={`/property/${propiedadId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1.5 flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/60 p-2 transition-colors hover:bg-card"
    >
      <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
        {foto ? (
          <Image
            src={foto}
            alt={propiedad?.titulo ?? 'Propiedad'}
            fill
            sizes="56px"
            unoptimized={esImagenExterna(foto)}
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Home className="size-5" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-foreground">{propiedad?.titulo}</p>
        <Money value={propiedad?.precio ?? 0} period="mes" size="sm" className="text-foreground" />
      </div>
    </Link>
  );
}
