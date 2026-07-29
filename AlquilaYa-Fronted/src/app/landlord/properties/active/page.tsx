'use client';
// Fuerza re-compilación para la nueva arquitectura de Perfil (Arrendador Id)

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/legacy-badge';
import { Button } from '@/components/ui/legacy-button';
import { Button as ActionButton } from '@/components/ui/button';
import { Card } from '@/components/ui/legacy-card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EditPropertyModal } from '@/components/landlord/edit-property-modal';
import { PropertyImageFallback } from '@/components/shared/property-image-fallback';
import { propiedadService } from '@/services/landlord-property-service';
import { borradorService, type BorradorPayload } from '@/services/borrador-service';
import { analyticsService, type AnaliticaPropiedad } from '@/services/analytics-service';
import { useAuthStore } from '@/stores/auth-store';
import { formatPEN } from '@/lib/money';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/cn';
import type { PropiedadBackend } from '@/types/propiedad';
import Link from 'next/link';

// Recharts no soporta SSR en este proyecto (mismo problema que VistasChart) — se importa
// dinámicamente y solo se monta en cliente.
const MiniSparkline = dynamic(() => import('@/components/landlord/mini-sparkline'), { ssr: false });

/** Ítem forma de la card: la entidad cruda del backend + flags que agregamos client-side. */
type PropiedadItem = PropiedadBackend & {
  /** true solo para los borradores con publicación programada que mezclamos en esta vista (#328). */
  esBorradorProgramado?: boolean;
};

type FiltroEstado = 'TODOS' | 'PENDIENTE' | 'APROBADO' | 'PROGRAMADA' | 'RECHAZADO';
type Orden = 'recientes' | 'vistas' | 'precio';
type Vista = 'tarjetas' | 'comparativa';
type ColumnaRanking = 'vistas' | 'favoritos' | 'contactos' | 'reservas' | 'conversion';

const TAMANO_PAGINA = 12;

const FILTROS_ESTADO: { id: FiltroEstado; label: string }[] = [
  { id: 'TODOS', label: 'Todas' },
  { id: 'PENDIENTE', label: 'Pendientes' },
  { id: 'APROBADO', label: 'Publicadas' },
  { id: 'PROGRAMADA', label: 'Programadas' },
  { id: 'RECHAZADO', label: 'Rechazadas' },
];

const VISTAS: { id: Vista; label: string }[] = [
  { id: 'tarjetas', label: 'Tarjetas' },
  { id: 'comparativa', label: 'Comparativa' },
];

const COLUMNAS_RANKING: { id: ColumnaRanking; label: string }[] = [
  { id: 'vistas', label: 'Vistas' },
  { id: 'favoritos', label: 'Favoritos' },
  { id: 'contactos', label: 'Contactos' },
  { id: 'reservas', label: 'Reservas' },
  { id: 'conversion', label: 'Conversión' },
];

function estadoVisual(p: PropiedadItem): FiltroEstado {
  if (p.esBorradorProgramado) return 'PROGRAMADA';
  if (p.estado === 'PENDIENTE') return 'PENDIENTE';
  if (p.estado === 'APROBADO') return 'APROBADO';
  if (p.estado === 'RECHAZADO') return 'RECHAZADO';
  return 'TODOS';
}

function formatearFechaProgramada(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/**
 * Ítem 346: score de calidad 100% client-side. Base de 40 pts porque título/precio/dirección
 * ya son obligatorios para publicar (todo anuncio activo los cumple) — los 60 pts restantes
 * miden qué tan "premium" está el anuncio (fotos, descripción, video, servicios).
 */
interface ScoreDetalle { label: string; ok: boolean; pts: number }
function calcularCalidad(p: PropiedadItem): { score: number; detalles: ScoreDetalle[] } {
  const fotos = p.imagenes?.length ?? 0;
  const descLen = p.descripcion?.trim().length ?? 0;
  const tieneVideo = !!p.videoUrl?.trim();
  const serviciosCount = p.servicios?.length ?? p.serviciosIncluidos?.length ?? 0;
  const detalles: ScoreDetalle[] = [
    { label: 'Al menos 8 fotos', ok: fotos >= 8, pts: 20 },
    { label: 'Descripción detallada (200+ caracteres)', ok: descLen >= 200, pts: 15 },
    { label: 'Video de la propiedad', ok: tieneVideo, pts: 15 },
    { label: '3 o más servicios marcados', ok: serviciosCount >= 3, pts: 10 },
  ];
  const BASE = 40;
  const score = BASE + detalles.reduce((acc, d) => acc + (d.ok ? d.pts : 0), 0);
  return { score, detalles };
}

export default function ActivePropertiesPage() {
  const { usuario } = useAuthStore();
  const router = useRouter();
  const [properties, setProperties] = useState<PropiedadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PropiedadItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editProp, setEditProp] = useState<PropiedadItem | null>(null);

  // ── 308: búsqueda / filtro / orden / paginación ──
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('TODOS');
  const [orden, setOrden] = useState<Orden>('recientes');
  const [pagina, setPagina] = useState(0);

  // ── 330: tarjetas vs. tabla comparativa ──
  const [vista, setVista] = useState<Vista>('tarjetas');
  const [ordenRanking, setOrdenRanking] = useState<ColumnaRanking>('vistas');

  // ── 329/330: analítica por propiedad, compartida entre sparklines y el ranking ──
  const [analiticaPorId, setAnaliticaPorId] = useState<Record<number, AnaliticaPropiedad>>({});

  const fetchProperties = async () => {
    if (!usuario) {
      setLoading(false);
      return;
    }
    const landlordId = usuario.perfilId ?? Number(usuario.id);
    if (!landlordId || Number.isNaN(landlordId)) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [publicadas, borradores] = await Promise.all([
        propiedadService.obtenerPorArrendador(landlordId.toString()),
        borradorService.listar().catch(() => [] as PropiedadBackend[]),
      ]);
      // #328: un borrador programado sigue en estado BORRADOR (por eso el endpoint de
      // "publicadas" lo excluye) pero el arrendador quiere verlo en esta misma vista con
      // su fecha de publicación y opción de cancelar.
      const programadas = borradores.filter((b) => !!b.fechaPublicacionProgramada);

      // La portada real es la primera imagen por orden; el imagenUrl legacy puede estar
      // desfasado (apuntar a una foto ya borrada). Derivamos la portada de la lista.
      const conPortada = (list: PropiedadBackend[], esProgramada: boolean): PropiedadItem[] =>
        list.map((p) => {
          const portada =
            (p.imagenes ?? []).slice().sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))[0]?.url ?? p.imagenUrl;
          return { ...p, imagenUrl: portada, esBorradorProgramado: esProgramada };
        });

      setProperties([...conPortada(publicadas, false), ...conPortada(programadas, true)]);
    } catch (err) {
      console.error('Error al cargar propiedades:', err);
      setError('No se pudieron cargar tus propiedades. Asegúrate de que el servidor esté activo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

  // ── 329/330: trae la analítica de cada propiedad visible (N llamadas, no hay endpoint bulk) ──
  useEffect(() => {
    if (properties.length === 0) {
      setAnaliticaPorId({});
      return;
    }
    let cancelado = false;
    Promise.all(
      properties.map((p) =>
        analyticsService
          .obtener(p.id)
          .then((data) => [p.id, data] as const)
          .catch(() => null),
      ),
    ).then((results) => {
      if (cancelado) return;
      const map: Record<number, AnaliticaPropiedad> = {};
      for (const r of results) {
        if (r) map[r[0]] = r[1];
      }
      setAnaliticaPorId(map);
    });
    return () => {
      cancelado = true;
    };
  }, [properties]);

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    try {
      setDeleting(true);
      await propiedadService.eliminar(confirmDelete.id);
      notify.success('Propiedad eliminada');
      setConfirmDelete(null);
      await fetchProperties();
    } catch (err) {
      notify.error(err, 'No se pudo eliminar la propiedad');
    } finally {
      setDeleting(false);
    }
  };

  const [confirmandoId, setConfirmandoId] = useState<number | string | null>(null);
  const handleConfirmarDisponibilidad = async (prop: PropiedadItem) => {
    try {
      setConfirmandoId(prop.id);
      await propiedadService.confirmarDisponibilidad(prop.id);
      notify.success('¡Gracias!', 'Tu aviso quedó confirmado como vigente.');
      setProperties((prev) =>
        prev.map((p) => (p.id === prop.id ? { ...p, requiereReconfirmacion: false } : p)),
      );
    } catch (err) {
      notify.error(err, 'No se pudo confirmar la disponibilidad');
    } finally {
      setConfirmandoId(null);
    }
  };

  // ── 328: cancelar la publicación programada de un borrador ──
  const [cancelandoId, setCancelandoId] = useState<number | string | null>(null);
  const handleCancelarProgramacion = async (prop: PropiedadItem) => {
    try {
      setCancelandoId(prop.id);
      await borradorService.cancelarProgramacion(Number(prop.id));
      notify.success('Programación cancelada');
      await fetchProperties();
    } catch (err) {
      notify.error(err, 'No se pudo cancelar la programación');
    } finally {
      setCancelandoId(null);
    }
  };

  // ── 347: duplicar propiedad (sin imágenes, vía borrador) ──
  const [duplicandoId, setDuplicandoId] = useState<number | string | null>(null);
  const handleDuplicar = async (prop: PropiedadItem) => {
    try {
      setDuplicandoId(prop.id);
      const payload: BorradorPayload = {
        titulo: prop.titulo ? `${prop.titulo} (copia)` : undefined,
        descripcion: prop.descripcion,
        precio: prop.precio,
        deposito: prop.deposito,
        direccion: prop.direccion,
        ubicacionGps: prop.ubicacionGps,
        tipoPropiedad: prop.tipoPropiedad,
        periodoAlquiler: prop.periodoAlquiler,
        area: prop.area,
        nroPiso: prop.nroPiso,
        numDormitorios: prop.numDormitorios,
        numBanos: prop.numBanos,
        capacidadPersonas: prop.capacidadPersonas,
        tieneSala: prop.tieneSala,
        tieneCocina: prop.tieneCocina,
        amoblado: prop.amoblado,
        // No copiamos gestionPorHabitacion: las habitaciones (con su propio precio/estado) no
        // se duplican junto con la propiedad, así que un duplicado "por habitación" quedaría
        // sin cuartos y no se podría aprobar (AdminPropiedadController lo rechaza sin habitaciones).
        gestionPorHabitacion: false,
        latitud: prop.latitud,
        longitud: prop.longitud,
        serviciosIncluidos: prop.serviciosIncluidos,
        servicios: prop.servicios,
        reglas: prop.reglas,
        estaDisponible: prop.estaDisponible,
        videoUrl: prop.videoUrl,
        politicaCancelacion: prop.politicaCancelacion,
      };
      const nuevo = await borradorService.crear(payload);
      notify.success('Propiedad duplicada', 'Se creó un borrador sin fotos. Complétalo y publícalo.');
      router.push(`/landlord/properties/add?borrador=${nuevo.id}`);
    } catch (err) {
      notify.error(err, 'No se pudo duplicar la propiedad');
    } finally {
      setDuplicandoId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDIENTE':
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-white/95 backdrop-blur-sm text-amber-600 px-2.5 py-1 rounded-full shadow-md">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
            En revisión
          </span>
        );
      case 'APROBADO':
      case 'ACTIVA':
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-white/95 backdrop-blur-sm text-emerald-600 px-2.5 py-1 rounded-full shadow-md">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            Publicada
          </span>
        );
      case 'RECHAZADO':
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-white/95 backdrop-blur-sm text-rose-600 px-2.5 py-1 rounded-full shadow-md">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
            Rechazada
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-white/95 backdrop-blur-sm text-muted-foreground px-2.5 py-1 rounded-full shadow-md">
            {status}
          </span>
        );
    }
  };

  // ── 308: búsqueda + filtro + orden ──
  const filtradas = useMemo(() => {
    let res = properties;
    if (filtroEstado !== 'TODOS') res = res.filter((p) => estadoVisual(p) === filtroEstado);
    const q = busqueda.trim().toLowerCase();
    if (q) res = res.filter((p) => (p.titulo ?? '').toLowerCase().includes(q));

    const out = res.slice();
    if (orden === 'recientes') {
      out.sort((a, b) => new Date(b.fechaCreacion ?? 0).getTime() - new Date(a.fechaCreacion ?? 0).getTime());
    } else if (orden === 'vistas') {
      out.sort((a, b) => (b.vistas ?? 0) - (a.vistas ?? 0));
    } else if (orden === 'precio') {
      out.sort((a, b) => (a.precio ?? 0) - (b.precio ?? 0));
    }
    return out;
  }, [properties, filtroEstado, busqueda, orden]);

  useEffect(() => {
    setPagina(0);
  }, [filtroEstado, busqueda, orden]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / TAMANO_PAGINA));
  const paginadas = filtradas.slice(pagina * TAMANO_PAGINA, (pagina + 1) * TAMANO_PAGINA);

  // ── 330: tabla comparativa (comparte la analítica ya obtenida para los sparklines) ──
  const filasRanking = useMemo(() => {
    return properties
      .filter((p) => !p.esBorradorProgramado)
      .map((p) => {
        const a = analiticaPorId[p.id];
        const vistas = a?.embudo.vistas ?? 0;
        const favoritos = a?.embudo.favoritos ?? 0;
        const contactos = a?.embudo.contactos ?? 0;
        const reservas = a?.embudo.reservas ?? 0;
        const conversion = vistas > 0 ? (reservas / vistas) * 100 : 0;
        return { id: p.id, titulo: p.titulo, vistas, favoritos, contactos, reservas, conversion, tieneData: !!a };
      })
      .sort((x, y) => y[ordenRanking] - x[ordenRanking]);
  }, [properties, analiticaPorId, ordenRanking]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] animate-pulse">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground font-medium">Cargando tu inventario...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 animate-in fade-in slide-in-from-bottom-2 duration-400">
      {/* Cabecera de Sección */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <Badge variant="surface" className="mb-2">
            Mis Publicaciones
          </Badge>
          <h1 className="text-4xl font-black text-foreground tracking-tighter sm:text-5xl">
            Cuartos <span className="text-primary">Activos</span>
          </h1>
          <p className="text-muted-foreground mt-2 max-w-lg">
            Aquí puedes gestionar la disponibilidad de tus habitaciones y ver el estado de tus
            publicaciones.
          </p>
        </div>

        <Button asChild variant="dark" className="h-12 px-6 rounded-2xl font-bold gap-2">
          <Link href="/landlord/properties/add">
            <span className="material-symbols-outlined">add</span>
            Publicar Nuevo
          </Link>
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-2xl border border-destructive/20 mb-8 flex items-center gap-3">
          <span className="material-symbols-outlined">error</span>
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* ── 330: Tabs tarjetas / comparativa ── */}
      <div className="flex gap-2 border-b border-border mb-6">
        {VISTAS.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setVista(v.id)}
            className={cn(
              'px-5 py-2.5 text-[12px] font-black uppercase tracking-wider transition-all rounded-t-xl',
              vista === v.id
                ? 'bg-background text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted',
            )}
          >
            {v.label}
          </button>
        ))}
      </div>

      {vista === 'tarjetas' ? (
        <>
          {/* ── 308: barra de búsqueda / orden / chips de estado ── */}
          <div className="rounded-3xl border border-border bg-card p-5 space-y-4 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[18px]">
                  search
                </span>
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por título…"
                  className="w-full rounded-2xl bg-muted border border-border pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 shrink-0">
                  Ordenar
                </label>
                <select
                  value={orden}
                  onChange={(e) => setOrden(e.target.value as Orden)}
                  className="rounded-2xl bg-muted border border-border px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all cursor-pointer"
                >
                  <option value="recientes">Más recientes</option>
                  <option value="vistas">Más vistas</option>
                  <option value="precio">Mejor precio</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {FILTROS_ESTADO.map((f) => {
                const total =
                  f.id === 'TODOS' ? properties.length : properties.filter((p) => estadoVisual(p) === f.id).length;
                const activo = filtroEstado === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFiltroEstado(f.id)}
                    className={cn(
                      'inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-wider transition-all',
                      activo ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {f.label}
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[9px] font-black',
                        activo ? 'bg-background/25 text-background' : 'bg-muted',
                      )}
                    >
                      {total}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grid de Propiedades */}
          {filtradas.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
                {paginadas.map((prop) => {
                  const { score } = calcularCalidad(prop);
                  const analitica = analiticaPorId[prop.id];
                  const esRechazada = prop.estado === 'RECHAZADO';
                  return (
                    <Card
                      key={prop.id}
                      padding="none"
                      className="group overflow-hidden rounded-3xl border-0 shadow-lg hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 bg-white"
                    >
                      {/* ── Image area ─────────────────────────────────── */}
                      <div className="relative aspect-[3/2] overflow-hidden rounded-t-3xl">
                        <PropertyImageFallback src={prop.imagenUrl} alt={prop.titulo} />

                        {/* Deep gradient overlay — bottom two-thirds */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                        {/* Top tint strip for badge legibility */}
                        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/30 to-transparent" />

                        {/* Status badge — top left (#328: badge distinto para programadas) */}
                        <div className="absolute top-3 left-3 z-10">
                          {prop.esBorradorProgramado ? (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-white/95 backdrop-blur-sm text-violet-600 px-2.5 py-1 rounded-full shadow-md">
                              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                              Programada
                            </span>
                          ) : (
                            getStatusBadge(prop.estado)
                          )}
                        </div>

                        {/* Price pill — bottom right */}
                        <div className="absolute bottom-3 right-3 z-10">
                          <span className="inline-flex items-baseline gap-0.5 font-black text-white text-[15px] px-3.5 py-1.5 rounded-2xl shadow-xl bg-primary">
                            {formatPEN(prop.precio)}
                            <span className="text-[10px] font-medium text-white/70 ml-0.5">/mes</span>
                          </span>
                        </div>

                        {/* Bottom-left faint location ghost text on image */}
                        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1 max-w-[60%]">
                          <span className="material-symbols-outlined text-white/80 text-[13px] shrink-0">location_on</span>
                          <span className="text-white/80 text-[11px] font-medium line-clamp-1 drop-shadow">
                            {prop.direccion}
                          </span>
                        </div>
                      </div>

                      {/* ── Card body ──────────────────────────────────── */}
                      <div className="px-5 pt-4 pb-1 bg-white">
                        <h3 className="font-extrabold text-[15px] text-gray-900 line-clamp-1 leading-snug tracking-tight">
                          {prop.titulo}
                        </h3>

                        {/* Subtle accent underline */}
                        <div className="mt-1.5 mb-3 h-0.5 w-10 rounded-full bg-primary" />

                        {/* Location row */}
                        <div className="flex items-center gap-1.5 text-gray-500 mb-3">
                          <span className="material-symbols-outlined text-[15px] shrink-0 text-primary">location_on</span>
                          <p className="text-xs line-clamp-1 font-medium">{prop.direccion}</p>
                        </div>

                        {/* 329: mini-sparkline de vistas (30 días) */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                            Vistas · 30 días
                          </span>
                          {analitica ? (
                            <MiniSparkline data={analitica.vistasPorDia} />
                          ) : (
                            <div className="h-5 w-[60px] rounded bg-gray-100 animate-pulse" />
                          )}
                        </div>

                        {/* 346: score de calidad del anuncio */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                              Calidad del anuncio
                            </span>
                            <span className="text-[11px] font-black text-primary">{score}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${score}%` }}
                            />
                          </div>
                          {score < 100 && (
                            <p className="mt-1 text-[10px] text-gray-400 leading-snug">
                              Los anuncios completos reciben 3× más contactos
                            </p>
                          )}
                        </div>

                        {/* Caducidad (#49): pide reconfirmar que el aviso sigue vigente */}
                        {prop.requiereReconfirmacion && (
                          <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3">
                            <p className="flex items-start gap-1.5 text-[11px] font-semibold text-amber-800">
                              <span className="material-symbols-outlined text-[15px] shrink-0">schedule</span>
                              ¿Sigue disponible? Confírmalo para mantener tu aviso al día.
                            </p>
                            <Button
                              type="button"
                              onClick={() => handleConfirmarDisponibilidad(prop)}
                              disabled={confirmandoId === prop.id}
                              size="sm"
                              className="mt-2 h-8 w-full rounded-lg bg-amber-500 text-[11px] font-bold text-white hover:bg-amber-600 border-0"
                            >
                              {confirmandoId === prop.id ? 'Confirmando…' : 'Confirmar disponibilidad'}
                            </Button>
                          </div>
                        )}

                        {/* 328: propiedad programada — fecha + cancelar */}
                        {prop.esBorradorProgramado && (
                          <div className="mb-4 rounded-xl border border-violet-300 bg-violet-50 p-3">
                            <p className="flex items-start gap-1.5 text-[11px] font-semibold text-violet-800">
                              <span className="material-symbols-outlined text-[15px] shrink-0">event_upcoming</span>
                              Se publica el {formatearFechaProgramada(prop.fechaPublicacionProgramada)}
                            </p>
                            <Button
                              type="button"
                              onClick={() => handleCancelarProgramacion(prop)}
                              disabled={cancelandoId === prop.id}
                              size="sm"
                              variant="outline"
                              className="mt-2 h-8 w-full rounded-lg text-[11px] font-bold border-violet-300 text-violet-700 hover:bg-violet-100"
                            >
                              {cancelandoId === prop.id ? 'Cancelando…' : 'Cancelar programación'}
                            </Button>
                          </div>
                        )}

                        {/* 348: motivo de rechazo */}
                        {esRechazada && (
                          <div className="mb-4 rounded-xl border border-rose-300 bg-rose-50 p-3">
                            <p className="flex items-start gap-1.5 text-[11px] font-semibold text-rose-800">
                              <span className="material-symbols-outlined text-[15px] shrink-0">report</span>
                              {prop.motivoRechazo?.trim()
                                ? prop.motivoRechazo
                                : 'El administrador rechazó este anuncio. Revísalo y corrígelo.'}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* ── Divider ────────────────────────────────────── */}
                      <div className="h-px mx-0 bg-primary/10" />

                      {/* ── Analítica (#51–55) ─────────────────────────── */}
                      <Link
                        href={`/landlord/properties/${prop.id}/analytics?titulo=${encodeURIComponent(prop.titulo)}`}
                        className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-primary hover:bg-primary/5 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">monitoring</span>
                        Ver analítica
                      </Link>

                      {/* ── Divider ────────────────────────────────────── */}
                      <div className="h-px mx-0 bg-primary/10" />

                      {/* 345: vista previa "Ver como estudiante" */}
                      <a
                        href={`/property/${prop.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">visibility</span>
                        Ver como estudiante
                      </a>

                      {/* ── Divider ────────────────────────────────────── */}
                      <div className="h-px mx-0 bg-primary/10" />

                      {/* ── Action row (309: sin estilos inline, botones shadcn) ── */}
                      <div className="flex items-center gap-2 px-4 py-3 bg-white">
                        <ActionButton
                          type="button"
                          onClick={() => {
                            if (prop.esBorradorProgramado) {
                              router.push(`/landlord/properties/add?borrador=${prop.id}`);
                            } else if (esRechazada) {
                              // Ítem 348: corregir un rechazo suele requerir tocar más que
                              // precio/disponibilidad — manda a la página de edición completa
                              // (ítem 311) en vez del modal rápido.
                              router.push(`/landlord/properties/${prop.id}/edit`);
                            } else {
                              setEditProp(prop);
                            }
                          }}
                          variant="outline"
                          size="sm"
                          className="flex-1 h-9 rounded-xl text-xs font-bold gap-1.5"
                        >
                          <span className="material-symbols-outlined text-[15px]">edit</span>
                          {esRechazada ? 'Corregir y reenviar' : 'Editar'}
                        </ActionButton>

                        <ActionButton
                          type="button"
                          onClick={() => handleDuplicar(prop)}
                          disabled={duplicandoId === prop.id}
                          variant="secondary"
                          size="icon"
                          className="h-11 w-11 rounded-xl shrink-0"
                          title="Duplicar propiedad"
                          aria-label={`Duplicar propiedad ${prop.titulo ?? ''}`.trim()}
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {duplicandoId === prop.id ? 'progress_activity' : 'content_copy'}
                          </span>
                        </ActionButton>

                        <ActionButton
                          type="button"
                          onClick={() => setConfirmDelete(prop)}
                          variant="destructive"
                          size="sm"
                          className="flex-1 h-9 rounded-xl text-xs font-bold gap-1.5"
                        >
                          <span className="material-symbols-outlined text-[15px]">delete</span>
                          Eliminar
                        </ActionButton>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* 308: paginación (solo si hay más de una página) */}
              {totalPaginas > 1 && (
                <div className="flex items-center justify-between gap-3 pt-8">
                  <p className="text-[11px] text-muted-foreground font-medium">
                    Página <span className="font-black text-foreground">{pagina + 1}</span> de{' '}
                    <span className="font-black text-foreground">{totalPaginas}</span> · {filtradas.length} propiedades
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pagina === 0}
                      onClick={() => setPagina((p) => Math.max(0, p - 1))}
                      leftIcon={<span className="material-symbols-outlined text-[16px]">chevron_left</span>}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="dark"
                      size="sm"
                      disabled={pagina + 1 >= totalPaginas}
                      onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))}
                      rightIcon={<span className="material-symbols-outlined text-[16px]">chevron_right</span>}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-muted rounded-[2.5rem] p-12 text-center border-2 border-dashed border-border-variant/50">
              <div className="w-20 h-20 bg-background rounded-full flex items-center justify-center mx-auto mb-6 text-muted-foreground/30">
                <span className="material-symbols-outlined text-4xl">
                  {properties.length > 0 ? 'search_off' : 'inventory_2'}
                </span>
              </div>
              <h2 className="text-2xl font-black text-foreground tracking-tight mb-2">
                {properties.length > 0 ? 'Sin resultados' : 'Aún no tienes publicaciones'}
              </h2>
              <p className="text-muted-foreground max-w-sm mx-auto mb-8">
                {properties.length > 0
                  ? 'Ningún anuncio coincide con la búsqueda o los filtros aplicados.'
                  : 'Empieza a publicar tus habitaciones disponibles para que los estudiantes puedan encontrarte.'}
              </p>
              {properties.length > 0 ? (
                <Button
                  variant="ghost"
                  className="rounded-2xl h-12 px-8"
                  onClick={() => {
                    setBusqueda('');
                    setFiltroEstado('TODOS');
                  }}
                >
                  Limpiar filtros
                </Button>
              ) : (
                <Button asChild variant="dark" className="rounded-2xl h-12 px-8">
                  <Link href="/landlord/properties/add">Empezar a publicar</Link>
                </Button>
              )}
            </div>
          )}
        </>
      ) : (
        /* ── 330: Comparativa ── */
        <div className="space-y-4">
          <p className="text-muted-foreground text-[12px] font-medium">
            Compara el desempeño de tus propiedades publicadas. Haz clic en una columna para ordenar.
          </p>
          {properties.filter((p) => !p.esBorradorProgramado).length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16 px-6 rounded-[2.5rem] border border-dashed border-border bg-card">
              <div className="w-16 h-16 rounded-full bg-muted text-muted-foreground flex items-center justify-center mb-5">
                <span className="material-symbols-outlined text-3xl">bar_chart</span>
              </div>
              <h2 className="text-xl font-black text-foreground tracking-tight">Nada que comparar todavía</h2>
              <p className="text-muted-foreground text-sm font-medium mt-1 max-w-sm">
                Publica al menos una propiedad para ver su desempeño aquí.
              </p>
            </div>
          ) : (
            <Card variant="glass" padding="none" className="overflow-hidden border border-border">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted border-b border-border">
                      <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-muted-foreground opacity-60">
                        Propiedad
                      </th>
                      {COLUMNAS_RANKING.map((c) => (
                        <th
                          key={c.id}
                          className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-muted-foreground opacity-60 text-right"
                        >
                          <button
                            type="button"
                            onClick={() => setOrdenRanking(c.id)}
                            className={cn(
                              'inline-flex items-center gap-1 ml-auto hover:text-foreground transition-colors',
                              ordenRanking === c.id && 'text-primary',
                            )}
                          >
                            {c.label}
                            {ordenRanking === c.id && (
                              <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
                            )}
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filasRanking.map((f, idx) => (
                      <tr key={f.id} className="hover:bg-muted transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2.5">
                            <span className="text-[10px] font-black text-muted-foreground w-4 shrink-0">{idx + 1}</span>
                            <p className="text-sm font-black text-foreground/90 line-clamp-1 max-w-[240px]">
                              {f.titulo}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-foreground">{f.vistas}</td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-foreground">{f.favoritos}</td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-foreground">{f.contactos}</td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-foreground">{f.reservas}</td>
                        <td className="px-6 py-4 text-right text-sm font-black text-primary">
                          {f.conversion.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      <EditPropertyModal
        prop={editProp}
        onClose={() => setEditProp(null)}
        onSaved={fetchProperties}
      />

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(v) => {
          if (!v && !deleting) setConfirmDelete(null);
        }}
      >
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar propiedad</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete &&
                `¿Seguro que deseas eliminar "${confirmDelete.titulo}"? Esta acción no se puede deshacer.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} onClick={() => setConfirmDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
