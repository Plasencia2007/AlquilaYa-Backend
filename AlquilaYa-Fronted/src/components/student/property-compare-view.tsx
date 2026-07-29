'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { BadgeCheck, Check, ExternalLink, Loader2, X } from 'lucide-react';

import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { distanciaAUpeuKm, formatearDistancia } from '@/lib/geo';
import { formatPEN } from '@/lib/money';
import { formatearFecha } from '@/lib/relative-time';
import { POLITICA_CANCELACION_INFO } from '@/lib/politica-cancelacion';
import { useCompareStore } from '@/stores/compare-store';
import { REGLAS_CATALOGO, SERVICIOS_CATALOGO } from '@/types/propiedad';
import type { PropiedadCompleta } from '@/types/propiedad';

/**
 * Trae en paralelo cada propiedad seleccionada (`GET /propiedades/{id}/completo`).
 *
 * El estado de carga se DERIVA comparando la clave de los ids pedidos con la de los
 * datos ya en memoria (en vez de resetear con `setState` al inicio del efecto), para
 * no disparar la regla `react-hooks/set-state-in-effect`: aquí `setState` solo se
 * llama dentro de los callbacks asíncronos `.then`/`.catch`.
 */
function useComparePropiedades(ids: string[], activo: boolean) {
  const key = ids.join(',');
  const [state, setState] = useState<{
    key: string;
    datos: PropiedadCompleta[] | null;
    estado: 'cargando' | 'ok' | 'error';
  }>({ key: '', datos: null, estado: 'cargando' });

  useEffect(() => {
    const idList = key ? key.split(',') : [];
    if (!activo || idList.length === 0) return;
    let cancelado = false;

    Promise.all(
      idList.map((id) =>
        api.get<PropiedadCompleta>(`propiedades/${id}/completo`).then((r) => r.data),
      ),
    )
      .then((items) => {
        if (!cancelado) setState({ key, datos: items, estado: 'ok' });
      })
      .catch(() => {
        if (!cancelado) setState({ key, datos: null, estado: 'error' });
      });

    return () => {
      cancelado = true;
    };
  }, [activo, key]);

  // Si lo cargado no corresponde a los ids actuales, seguimos "cargando".
  const estado: 'cargando' | 'ok' | 'error' = state.key === key ? state.estado : 'cargando';
  const datos = state.key === key ? state.datos : null;
  return { datos, estado };
}

interface ContentProps {
  ids: string[];
  onQuitar: (id: string) => void;
  /** El fetch solo corre cuando el contenido está montado/visible. */
  activo?: boolean;
}

/**
 * Cuerpo de la comparación SIN el chrome del diálogo: estados de carga/error y la
 * tabla lado a lado. Lo reutilizan tanto el modal (`PropertyCompareView`, abierto
 * desde la barra flotante) como la página `/comparar`.
 */
export function PropertyCompareContent({ ids, onQuitar, activo = true }: ContentProps) {
  const { datos, estado } = useComparePropiedades(ids, activo);

  if (estado === 'cargando') {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="size-6 animate-spin" aria-hidden />
        <span className="ml-2 text-sm">Cargando propiedades…</span>
      </div>
    );
  }

  if (estado === 'error' || !datos) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-sm font-medium text-foreground">No pudimos cargar la comparación</p>
        <p className="text-xs text-muted-foreground">Verifica tu conexión e inténtalo de nuevo.</p>
      </div>
    );
  }

  return <CompareTable propiedades={datos} onQuitar={onQuitar} />;
}

interface Props {
  ids: string[];
  open: boolean;
  onClose: () => void;
}

/**
 * Tabla comparativa en un modal (Radix Dialog), abierta desde la barra flotante de
 * comparación. La misma tabla, sin el diálogo, vive en la página `/comparar`.
 */
export function PropertyCompareView({ ids, open, onClose }: Props) {
  const toggle = useCompareStore((s) => s.toggle);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/70 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-0 z-50 flex flex-col bg-background md:inset-auto md:left-1/2 md:top-1/2 md:max-h-[90vh] md:w-[95vw] md:max-w-6xl md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:border md:border-border md:shadow-2xl',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
          )}
        >
          <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
            <div>
              <DialogPrimitive.Title className="font-headline text-lg font-bold text-foreground sm:text-xl">
                Comparar propiedades
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-xs text-muted-foreground sm:text-sm">
                {ids.length} propiedad{ids.length === 1 ? '' : 'es'} seleccionada
                {ids.length === 1 ? '' : 's'}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close
              aria-label="Cerrar comparación"
              className="grid size-9 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <X className="size-5" />
            </DialogPrimitive.Close>
          </header>

          <div className="flex-1 overflow-auto">
            <PropertyCompareContent
              ids={ids}
              activo={open}
              onQuitar={(id) => {
                toggle(id);
                // Si era la última, cerramos automáticamente.
                if (ids.length <= 1) onClose();
              }}
            />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

interface TablaProps {
  propiedades: PropiedadCompleta[];
  onQuitar: (id: string) => void;
}

/** Etiqueta legible de un servicio (usa el catálogo; si no, prettifica el valor crudo). */
function etiquetaServicio(valor: string): string {
  const cat = SERVICIOS_CATALOGO.find(
    (c) => c.clave === valor.toUpperCase() || c.etiqueta.toLowerCase() === valor.toLowerCase(),
  );
  if (cat) return cat.etiqueta;
  const t = valor.replace(/_/g, ' ').toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Etiqueta legible de una regla (usa el catálogo; si no, el valor crudo). */
function etiquetaRegla(valor: string): string {
  const cat = REGLAS_CATALOGO.find((r) => r.clave === valor || r.etiqueta === valor);
  return cat?.etiqueta ?? valor;
}

/** Celda ✓ / ✗ para la matriz de servicios. */
function CheckCell({ on }: { on: boolean }) {
  return on ? (
    <span className="inline-flex items-center gap-1 text-primary" title="Incluido">
      <Check className="size-4" aria-hidden />
      <span className="sr-only">Sí</span>
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-muted-foreground/50" title="No incluido">
      <X className="size-4" aria-hidden />
      <span className="sr-only">No</span>
    </span>
  );
}

type Fila =
  | { tipo: 'seccion'; label: string }
  | { tipo: 'dato'; label: string; render: (p: PropiedadCompleta) => React.ReactNode };

function CompareTable({ propiedades, onQuitar }: TablaProps) {
  // Unión de servicios presente en cualquiera de las propiedades → matriz ✓/✗.
  const serviciosUnion = useMemo(() => {
    const map = new Map<string, string>(); // clave normalizada → etiqueta a mostrar
    for (const p of propiedades) {
      for (const s of p.serviciosIncluidos ?? []) {
        const norm = s.toUpperCase();
        if (!map.has(norm)) map.set(norm, etiquetaServicio(s));
      }
    }
    return [...map.entries()]
      .map(([clave, etiqueta]) => ({ clave, etiqueta }))
      .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta));
  }, [propiedades]);

  const filas: Fila[] = [
    {
      tipo: 'dato',
      label: 'Precio',
      render: (p) => (
        <span className="tnum text-base font-bold text-foreground">
          {formatPEN(Number(p.precio ?? 0))}
        </span>
      ),
    },
    {
      tipo: 'dato',
      label: 'Calificación',
      render: (p) => {
        const total = p.numResenas ?? 0;
        if (total === 0) return <span className="text-muted-foreground">Sin reseñas</span>;
        return (
          <span>
            <span aria-hidden>★</span>{' '}
            <span className="font-medium">{(p.calificacion ?? 0).toFixed(1)}</span>{' '}
            <span className="text-muted-foreground">({total})</span>
          </span>
        );
      },
    },
    {
      tipo: 'dato',
      label: 'Distancia a UPeU',
      render: (p) => {
        const coords =
          p.latitud != null && p.longitud != null ? { lat: p.latitud, lng: p.longitud } : undefined;
        return <span>{formatearDistancia(distanciaAUpeuKm(coords))}</span>;
      },
    },
    {
      tipo: 'dato',
      label: 'Cancelación',
      render: (p) =>
        p.politicaCancelacion ? (
          <span title={POLITICA_CANCELACION_INFO[p.politicaCancelacion].resumen}>
            {POLITICA_CANCELACION_INFO[p.politicaCancelacion].label}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      tipo: 'dato',
      label: 'Reglas',
      render: (p) => {
        const reglas = p.reglas ?? [];
        if (reglas.length === 0) return <span className="text-muted-foreground">—</span>;
        return (
          <ul className="flex flex-wrap gap-1.5">
            {reglas.map((r) => (
              <li
                key={r}
                className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              >
                {etiquetaRegla(r)}
              </li>
            ))}
          </ul>
        );
      },
    },
    {
      tipo: 'dato',
      label: 'Arrendador',
      render: (p) => (
        <div className="flex items-center gap-1.5">
          <span className="truncate">{p.arrendadorNombre ?? '—'}</span>
          {p.arrendadorVerificado && (
            <BadgeCheck className="size-4 shrink-0 text-primary" aria-label="Verificado" />
          )}
        </div>
      ),
    },
    {
      tipo: 'dato',
      label: 'Disponible desde',
      render: (p) =>
        p.disponibleDesde ? (
          <span>{formatearFecha(p.disponibleDesde)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      tipo: 'dato',
      label: 'Tiempo de respuesta',
      render: (p) =>
        typeof p.tiempoRespuestaArrendador === 'number' ? (
          <span>{p.tiempoRespuestaArrendador} min</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ];

  // Matriz de servicios ✓/✗: un encabezado + una fila por servicio de la unión.
  if (serviciosUnion.length > 0) {
    filas.push({ tipo: 'seccion', label: 'Servicios' });
    for (const sv of serviciosUnion) {
      filas.push({
        tipo: 'dato',
        label: sv.etiqueta,
        render: (p) => (
          <CheckCell on={(p.serviciosIncluidos ?? []).some((s) => s.toUpperCase() === sv.clave)} />
        ),
      });
    }
  }

  const colCount = propiedades.length + 1;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse">
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 z-10 w-[140px] bg-background px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:w-[180px] sm:px-4"
            >
              <span className="sr-only">Atributo</span>
            </th>
            {propiedades.map((p) => (
              <th
                key={p.id}
                scope="col"
                className="min-w-[70vw] border-l border-border bg-background px-3 py-3 align-top sm:min-w-[260px] sm:px-4"
              >
                <div className="space-y-2">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-muted">
                    {p.imagenes && p.imagenes[0] ? (
                      <Image
                        src={p.imagenes[0]}
                        alt={p.titulo}
                        fill
                        sizes="(max-width: 768px) 70vw, 260px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-xs text-muted-foreground">
                        Sin imagen
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => onQuitar(String(p.id))}
                      aria-label={`Quitar ${p.titulo} de la comparación`}
                      className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-background/95 text-foreground shadow ring-1 ring-border transition hover:bg-background"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                  <h3 className="line-clamp-2 text-sm font-semibold text-foreground">{p.titulo}</h3>
                  {/* CTA de reserva por columna: la reserva real (auth + diálogo +
                      gestión por habitación) vive en la ficha; enlazamos ahí. */}
                  <Link
                    href={`/property/${p.id}`}
                    className="inline-flex w-full items-center justify-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
                  >
                    Reservar
                  </Link>
                  <Link
                    href={`/property/${p.id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    Ver detalle
                    <ExternalLink className="size-3" aria-hidden />
                  </Link>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) =>
            fila.tipo === 'seccion' ? (
              <tr key={`sec-${fila.label}`} className="border-t border-border">
                <td
                  colSpan={colCount}
                  className="sticky left-0 bg-muted/40 px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground sm:px-4"
                >
                  {fila.label}
                </td>
              </tr>
            ) : (
              <tr key={fila.label} className="border-t border-border">
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-background px-3 py-3 text-left text-xs font-semibold text-muted-foreground sm:px-4 sm:text-sm"
                >
                  {fila.label}
                </th>
                {propiedades.map((p) => (
                  <td
                    key={p.id}
                    className="border-l border-border px-3 py-3 align-top text-sm text-foreground sm:px-4"
                  >
                    {fila.render(p)}
                  </td>
                ))}
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}

export default PropertyCompareView;
