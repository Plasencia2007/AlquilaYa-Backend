'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Info, Loader2, TrendingUp } from 'lucide-react';

import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Money } from '@/components/ui/money';
import { catalogosService, type CatalogosActivos } from '@/services/catalogos-service';
import {
  propiedadService,
  type PrecioSugerido,
} from '@/services/landlord-property-service';
import { getZonasCached } from '@/lib/zonas-cache';
import type { ZonaResolucion } from '@/services/universidad-service';

/**
 * Fallback de tipos si el catálogo `TIPO_CUARTO` no responde — mismos valores del
 * enum `TipoPropiedad` del backend que usa el formulario de publicación.
 */
const TIPOS_FALLBACK: ComboboxOption[] = [
  { value: 'CUARTO_INDIVIDUAL', label: 'Cuarto individual' },
  { value: 'CUARTO_COMPARTIDO', label: 'Cuarto compartido' },
  { value: 'DEPARTAMENTO', label: 'Departamento' },
  { value: 'MINI_DEPA', label: 'Mini depa' },
  { value: 'CASA', label: 'Casa' },
  { value: 'SUITE', label: 'Suite' },
];

type Estado = 'idle' | 'loading' | 'ok' | 'sin-datos' | 'error';

/**
 * Calculadora de ingreso estimado (ítem 89 de MEJORAS.md). El arrendador elige zona
 * + tipo de cuarto y consulta `GET /propiedades/precio-sugerido` (estadísticas de avisos
 * aprobados parecidos). Con el promedio proyecta ingreso mensual/anual.
 *
 * Nota de negocio (verificado en servicio-pagos `PagoService`): el arrendador recibe el
 * alquiler ÍNTEGRO — la comisión de servicio se suma al estudiante, no se descuenta al
 * dueño — por eso la proyección NO resta comisión.
 */
export function IncomeCalculator() {
  const [zonas, setZonas] = useState<ZonaResolucion[]>([]);
  const [tipos, setTipos] = useState<ComboboxOption[]>(TIPOS_FALLBACK);
  const [cargandoOpciones, setCargandoOpciones] = useState(true);

  const [zonaId, setZonaId] = useState('');
  const [tipo, setTipo] = useState('');

  const [resultado, setResultado] = useState<PrecioSugerido | null>(null);
  const [estado, setEstado] = useState<Estado>('idle');

  // Secuencia de peticiones: descarta respuestas viejas si el usuario cambia la
  // selección antes de que la anterior resuelva.
  const reqId = useRef(0);

  // Cargar zonas (caché de módulo compartida) + tipos del catálogo, una sola vez.
  // Los setState viven en callbacks async (no en el cuerpo del efecto).
  useEffect(() => {
    let cancel = false;
    Promise.all([
      getZonasCached(),
      catalogosService.obtenerActivos().catch((): CatalogosActivos => ({})),
    ])
      .then(([zonasResp, cat]) => {
        if (cancel) return;
        setZonas(zonasResp);
        const tiposCat = cat?.TIPO_CUARTO ?? [];
        if (tiposCat.length) {
          setTipos(tiposCat.map((i) => ({ value: i.valor, label: i.nombre })));
        }
      })
      .finally(() => {
        if (!cancel) setCargandoOpciones(false);
      });
    return () => {
      cancel = true;
    };
  }, []);

  const zonaOptions = useMemo<ComboboxOption[]>(
    () =>
      zonas.map((z) => ({
        value: String(z.id),
        label: z.universidadNombre ? `${z.nombre} · ${z.universidadNombre}` : z.nombre,
      })),
    [zonas],
  );

  const zonaSel = useMemo(
    () => zonas.find((z) => String(z.id) === zonaId) ?? null,
    [zonas, zonaId],
  );

  // Consulta el precio sugerido. Se dispara desde los onChange (no desde un efecto),
  // por eso el estado de carga se ve al instante sin renders en cascada.
  const consultar = (zona: ZonaResolucion | null, tipoSel: string) => {
    if (!zona) {
      setResultado(null);
      setEstado('idle');
      return;
    }
    const id = ++reqId.current;
    setEstado('loading');
    propiedadService
      .obtenerPrecioSugerido({
        zonaId: zona.id,
        universidadId: zona.universidadId,
        tipo: tipoSel || undefined,
      })
      .then((d) => {
        if (id !== reqId.current) return;
        if (d && d.cantidad > 0 && (d.promedio ?? 0) > 0) {
          setResultado(d);
          setEstado('ok');
        } else {
          setResultado(null);
          setEstado('sin-datos');
        }
      })
      .catch(() => {
        if (id !== reqId.current) return;
        setResultado(null);
        setEstado('error');
      });
  };

  const onZonaChange = (v: string) => {
    setZonaId(v);
    consultar(zonas.find((z) => String(z.id) === v) ?? null, tipo);
  };

  const onTipoChange = (v: string) => {
    setTipo(v);
    consultar(zonaSel, v);
  };

  const promedio = resultado?.promedio ?? 0;
  const ambitoTxt =
    resultado?.ambito === 'ZONA' ? 'en esta zona' : 'cerca de tu universidad';

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-stretch">
      {/* ── Selectores ── */}
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        <h3 className="text-lg font-black tracking-tight text-foreground">
          Estima tu ingreso
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Elige dónde está tu cuarto y qué tipo es. Usamos precios reales de avisos
          publicados parecidos.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Zona
            </label>
            <Combobox
              options={zonaOptions}
              value={zonaId}
              onChange={onZonaChange}
              disabled={cargandoOpciones || zonaOptions.length === 0}
              placeholder={
                cargandoOpciones ? 'Cargando zonas…' : 'Selecciona una zona'
              }
              searchPlaceholder="Buscar zona…"
              emptyText="Sin zonas disponibles."
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Tipo de cuarto{' '}
              <span className="font-normal normal-case tracking-normal text-muted-foreground/70">
                (opcional)
              </span>
            </label>
            <Combobox
              options={tipos}
              value={tipo}
              onChange={onTipoChange}
              disabled={cargandoOpciones}
              placeholder="Cualquier tipo"
              searchPlaceholder="Buscar tipo…"
            />
          </div>
        </div>

        <p className="mt-5 flex items-start gap-2 text-[11px] leading-snug text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Estimación referencial basada en publicaciones aprobadas. No es una promesa de
          ingreso.
        </p>
      </div>

      {/* ── Resultado ── */}
      <div className="flex flex-col justify-center rounded-3xl border border-primary/15 bg-primary/[0.04] p-6 sm:p-8">
        {estado === 'idle' && (
          <div className="text-center text-muted-foreground">
            <TrendingUp className="mx-auto mb-3 size-8 text-primary/50" aria-hidden />
            <p className="text-sm font-medium">
              Elige una zona para ver tu ingreso estimado.
            </p>
          </div>
        )}

        {estado === 'loading' && (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" aria-hidden />
            <span className="text-sm font-medium">Calculando…</span>
          </div>
        )}

        {estado === 'sin-datos' && (
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">
              Aún no hay suficientes avisos parecidos {ambitoTxt}.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Publica el tuyo y conviértete en la referencia de precio de la zona.
            </p>
          </div>
        )}

        {estado === 'error' && (
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">
              No pudimos calcular ahora mismo.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Vuelve a intentarlo en un momento.
            </p>
          </div>
        )}

        {estado === 'ok' && resultado && (
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Ingreso mensual estimado
            </span>
            <div className="mt-1">
              <Money value={promedio} period="mes" size="lg" className="text-foreground" />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-card p-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Rango típico
                </span>
                <p className="mt-1 text-sm font-black text-foreground">
                  <Money value={resultado.min ?? promedio} size="sm" /> –{' '}
                  <Money value={resultado.max ?? promedio} size="sm" />
                </p>
              </div>
              <div className="rounded-2xl bg-card p-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Proyección anual
                </span>
                <div className="mt-1">
                  <Money value={promedio * 12} period="año" size="md" className="text-primary" />
                </div>
              </div>
            </div>

            <p className="mt-5 rounded-xl bg-primary/10 px-3 py-2.5 text-[11px] leading-snug text-foreground/80">
              Basado en{' '}
              <span className="font-bold">
                {resultado.cantidad} {resultado.cantidad === 1 ? 'aviso' : 'avisos'}
              </span>{' '}
              {ambitoTxt}. Recibes el{' '}
              <span className="font-bold text-primary">100%</span> del alquiler: la comisión
              de servicio la paga el estudiante, no tú.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
