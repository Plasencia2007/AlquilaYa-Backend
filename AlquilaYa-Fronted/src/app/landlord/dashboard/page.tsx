'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { StatCard } from '@/components/landlord/stat-card';
import { Card } from '@/components/ui/legacy-card';
import { Button } from '@/components/ui/legacy-button';
import { Badge } from '@/components/ui/legacy-badge';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/cn';
import VerificationPanel from '@/components/auth/verification-panel';
import {
  dashboardService,
  type DashboardArrendador,
  type ActividadReciente,
} from '@/services/landlord-dashboard-service';
import { propiedadService } from '@/services/landlord-property-service';

const IngresosChart = dynamic(
  () => import('@/components/landlord/IngresosChart'),
  { ssr: false }
);

interface PropiedadPreview {
  id: number | string;
  titulo: string;
  precio: number;
  direccion?: string;
  imagenUrl?: string;
  estado?: string;
  fechaCreacion?: string;
}

const ICONOS_ACTIVIDAD: Record<string, { icon: string; color: string }> = {
  RESERVA_NUEVA: { icon: 'add_home', color: 'text-blue-500' },
  RESERVA_APROBADA: { icon: 'check_circle', color: 'text-green-500' },
  RESERVA_PAGADA: { icon: 'payments', color: 'text-emerald-500' },
  RESERVA_FINALIZADA: { icon: 'task_alt', color: 'text-emerald-600' },
  RESERVA_RECHAZADA: { icon: 'cancel', color: 'text-red-500' },
  RESERVA_CANCELADA: { icon: 'block', color: 'text-amber-500' },
};

const formatearSoles = (valor: number) =>
  `S/ ${Number(valor || 0).toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const calcularTendencia = (actual: number, anterior: number): number => {
  if (!anterior || anterior === 0) {
    return actual > 0 ? 100 : 0;
  }
  return Math.round(((actual - anterior) / anterior) * 1000) / 10;
};

const formatearFechaRelativa = (iso: string) => {
  const fecha = new Date(iso);
  const ahora = Date.now();
  const diff = ahora - fecha.getTime();
  const minutos = Math.floor(diff / 60000);
  if (minutos < 1) return 'Ahora';
  if (minutos < 60) return `Hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `Hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias < 7) return `Hace ${dias} d`;
  return fecha.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
};

export default function LandlordDashboardPage() {
  const { usuario } = useAuth();
  const [metricas, setMetricas] = useState<DashboardArrendador | null>(null);
  const [propiedades, setPropiedades] = useState<PropiedadPreview[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const tareas: Promise<unknown>[] = [dashboardService.obtenerMetricas()];
      if (usuario?.perfilId) {
        tareas.push(propiedadService.obtenerPorArrendador(usuario.perfilId.toString()));
      }
      const [m, props] = await Promise.all(tareas);
      setMetricas(m as DashboardArrendador);
      const lista = Array.isArray(props) ? (props as PropiedadPreview[]) : [];
      const ordenadas = [...lista].sort((a, b) => {
        const fa = a.fechaCreacion ? new Date(a.fechaCreacion).getTime() : 0;
        const fb = b.fechaCreacion ? new Date(b.fechaCreacion).getTime() : 0;
        return fb - fa;
      });
      setPropiedades(ordenadas.slice(0, 2));
    } catch (e) {
      console.error('[dashboard] error cargando métricas', e);
      setError('No se pudieron cargar tus métricas. Verifica tu conexión e inténtalo de nuevo.');
    } finally {
      setCargando(false);
    }
  }, [usuario?.perfilId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const tendenciaIngresos = metricas
    ? calcularTendencia(metricas.ingresosMesActual, metricas.ingresosMesAnterior)
    : 0;

  return (
    <div className="space-y-10 animate-fade-in py-4">
      <VerificationPanel />

      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-4">
        <div>
          <h1 className="text-3xl font-black text-on-surface tracking-tighter opacity-90">
            Hola, <span className="text-blue-500 font-black">{usuario?.nombre.split(' ')[0] || 'Socio'}</span>.
          </h1>
          <p className="text-on-surface-variant text-[12px] font-medium mt-0.5 tracking-tight">
            Vistazo rápido de tus operaciones.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="border border-on-surface/5 text-[10px] font-bold"
            onClick={() => cargar()}
          >
            Actualizar
          </Button>
          <Button
            asChild
            variant="dark"
            size="sm"
            className="bg-[#171E6B] hover:bg-[#1A237E] text-[10px] font-black px-5 rounded-full"
          >
            <Link href="/landlord/properties/add">
              <span
                className="material-symbols-outlined text-[16px]"
                style={{ fontVariationSettings: "'wght' 300" }}
              >
                add
              </span>
              Nuevo Cuarto
            </Link>
          </Button>
        </div>
      </header>

      {error && (
        <div className="p-5 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-red-500">error</span>
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => cargar()} className="text-xs font-black">
            Reintentar
          </Button>
        </div>
      )}

      {cargando && !metricas ? (
        <SkeletonStats />
      ) : metricas ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            titulo="Ingresos del mes"
            valor={formatearSoles(metricas.ingresosMesActual)}
            tendencia={tendenciaIngresos}
            icon="payments"
            variant="minimal"
          />
          <StatCard
            titulo="Ocupación"
            valor={`${metricas.tasaOcupacion.toFixed(1)}%`}
            tendencia={0}
            icon="meeting_room"
            variant="minimal"
          />
          <StatCard
            titulo="Vistas (30d)"
            valor={metricas.vistasUltimos30Dias.toLocaleString('es-PE')}
            tendencia={0}
            icon="visibility"
            variant="minimal"
          />
          <StatCard
            titulo="Mensajes sin leer"
            valor={metricas.mensajesSinLeer.toLocaleString('es-PE')}
            tendencia={0}
            icon="chat"
            variant="minimal"
          />
        </div>
      ) : null}

      {metricas && (
        <Card variant="surface" padding="lg" className="border border-on-surface/5 bg-white/40">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black tracking-tight flex items-center gap-2 opacity-80">
              <span
                className="material-symbols-outlined text-blue-500 text-[18px]"
                style={{ fontVariationSettings: "'wght' 300" }}
              >
                bar_chart
              </span>
              Ingresos por mes
            </h3>
            <span className="text-[9px] font-black text-on-surface/40 uppercase tracking-widest">
              Últimos 7 meses
            </span>
          </div>
          <IngresosChart data={metricas.ingresosPorMes} />
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-md font-black tracking-tight flex items-center gap-2 opacity-80">
              Tus Cuartos
              {metricas && (
                <span className="text-[9px] font-black text-blue-500 bg-blue-500/5 border border-blue-500/10 px-2.5 py-0.5 rounded-full uppercase tracking-widest">
                  {metricas.propiedadesActivas} Activos
                </span>
              )}
            </h2>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-blue-500 font-black text-[10px] uppercase tracking-wider"
            >
              <Link href="/landlord/properties/active">Ver todos</Link>
            </Button>
          </div>

          {cargando && propiedades.length === 0 ? (
            <SkeletonProperties />
          ) : propiedades.length === 0 ? (
            <Card padding="lg" className="border border-dashed border-on-surface/10 bg-white/30 text-center">
              <p className="text-sm font-medium text-on-surface-variant mb-4">
                Aún no tienes propiedades publicadas.
              </p>
              <Button asChild variant="dark" size="sm">
                <Link href="/landlord/properties/add">Publicar la primera</Link>
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {propiedades.map((prop) => (
                <Card
                  key={prop.id}
                  padding="none"
                  className="group overflow-hidden border border-on-surface/5 hover:border-[#FF8A65]/30 transition-all duration-500 bg-white/40"
                >
                  <div className="relative h-44 overflow-hidden bg-on-surface/5">
                    {prop.imagenUrl ? (
                      <img
                        src={prop.imagenUrl}
                        className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105"
                        alt={prop.titulo}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-on-surface/20">
                        <span className="material-symbols-outlined text-4xl">image</span>
                      </div>
                    )}
                    <div className="absolute top-4 right-4">
                      <Badge
                        variant="glass"
                        className="bg-white/90 text-on-surface border-none shadow-lg text-[11px] font-black"
                      >
                        S/ {Number(prop.precio).toLocaleString('es-PE')}/m
                      </Badge>
                    </div>
                  </div>
                  <div className="p-6">
                    <h4 className="font-black text-md mb-1 truncate opacity-90">{prop.titulo}</h4>
                    <p className="text-[11px] text-on-surface-variant/70 font-medium flex items-center gap-1 mb-5">
                      <span
                        className="material-symbols-outlined text-[14px]"
                        style={{ fontVariationSettings: "'wght' 300" }}
                      >
                        location_on
                      </span>
                      {prop.direccion || 'Lima, Perú'}
                    </p>
                    <div className="flex items-center justify-between pt-5 border-t border-on-surface/5">
                      <Badge
                        variant="surface"
                        className="text-[9px] font-black uppercase tracking-widest"
                      >
                        {prop.estado || 'PENDIENTE'}
                      </Badge>
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:bg-blue-500/5 border border-transparent hover:border-blue-500/20 rounded-lg px-4"
                      >
                        <Link href="/landlord/properties/active">Gestionar</Link>
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-8">
          <Card variant="surface" padding="lg" className="border border-on-surface/5 bg-white/40">
            <h3 className="text-sm font-black tracking-tight mb-6 flex items-center gap-2 opacity-80">
              <span
                className="material-symbols-outlined text-blue-500 text-[18px]"
                style={{ fontVariationSettings: "'wght' 300" }}
              >
                history
              </span>
              Actividad reciente
            </h3>
            {cargando && !metricas ? (
              <SkeletonActivity />
            ) : metricas && metricas.actividadReciente.length > 0 ? (
              <div className="space-y-6">
                {metricas.actividadReciente.slice(0, 6).map((a, i) => (
                  <ActivityRow key={`${a.referenciaId}-${i}`} actividad={a} />
                ))}
              </div>
            ) : (
              <p className="text-xs font-medium text-on-surface-variant/70 py-4 text-center">
                Sin actividad reciente.
              </p>
            )}
            <Button
              asChild
              variant="outline"
              className="w-full mt-10 border-on-surface/5 text-[11px] font-black uppercase tracking-wider rounded-xl py-5"
              size="md"
            >
              <Link href="/landlord/reservations/history">Historial Completo</Link>
            </Button>
          </Card>

          <Card
            variant="surface"
            className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-6"
            padding="none"
          >
            <h4 className="font-black text-blue-500 text-[10px] mb-2 flex items-center gap-2 uppercase tracking-widest">
              <span
                className="material-symbols-outlined text-[16px]"
                style={{ fontVariationSettings: "'wght' 300" }}
              >
                lightbulb
              </span>
              Tip del día
            </h4>
            <p className="text-[11px] text-on-surface-variant font-medium leading-relaxed">
              Las propiedades con más de 5 fotos tienen un{' '}
              <span className="text-blue-500 font-black">40% más de reservas</span>.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ActivityRow({ actividad }: { actividad: ActividadReciente }) {
  const meta = ICONOS_ACTIVIDAD[actividad.tipo] ?? { icon: 'notifications', color: 'text-on-surface/60' };
  return (
    <div className="flex gap-4 group">
      <div
        className={cn(
          'w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0 border border-on-surface/5 transition-all group-hover:border-[#FF8A65]/50 shadow-sm',
          meta.color
        )}
      >
        <span
          className="material-symbols-outlined text-[18px]"
          style={{ fontVariationSettings: "'wght' 300" }}
        >
          {meta.icon}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-black text-on-surface/90">
          {actividad.tipo.replace(/_/g, ' ').toLowerCase()}
        </p>
        <p className="text-[11px] text-on-surface-variant/70 font-medium truncate mt-0.5">
          {actividad.descripcion}
        </p>
        <p className="text-[9px] text-on-surface/20 font-black uppercase mt-1.5 tracking-widest">
          {actividad.fecha ? formatearFechaRelativa(actividad.fecha) : ''}
        </p>
      </div>
    </div>
  );
}

function SkeletonStats() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white/40 border border-on-surface/5 p-6 rounded-3xl h-32 animate-pulse"
        />
      ))}
    </div>
  );
}

function SkeletonProperties() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="bg-white/40 border border-on-surface/5 rounded-2xl h-72 animate-pulse"
        />
      ))}
    </div>
  );
}

function SkeletonActivity() {
  return (
    <div className="space-y-6">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-4">
          <div className="w-9 h-9 rounded-xl bg-on-surface/5 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/2 bg-on-surface/5 rounded animate-pulse" />
            <div className="h-3 w-3/4 bg-on-surface/5 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
