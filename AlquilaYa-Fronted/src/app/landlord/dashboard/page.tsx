'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { StatCard, StatCardSkeleton } from '@/components/shared/stat-card';
import { Card } from '@/components/ui/legacy-card';
import { Button } from '@/components/ui/legacy-button';
import { Badge } from '@/components/ui/legacy-badge';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/cn';
import VerificationPanel from '@/components/auth/verification-panel';
import { OnboardingBanner, type OnboardingPaso } from '@/components/student/onboarding-banner';
import {
  dashboardService,
  type DashboardArrendador,
  type ActividadReciente,
} from '@/services/landlord-dashboard-service';
import { propiedadService } from '@/services/landlord-property-service';
import { profileService } from '@/services/profile-service';
import type { Perfil } from '@/types/profile';

const IngresosChart = dynamic(
  () => import('@/components/landlord/IngresosChart'),
  { ssr: false }
);

const OcupacionChart = dynamic(
  () => import('@/components/landlord/OcupacionChart'),
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
  /** Ítem 323: proxy de "disponibilidad configurada" para el onboarding (no hay endpoint dedicado). */
  disponibleDesde?: string;
}

const ICONOS_ACTIVIDAD: Record<string, { icon: string; color: string }> = {
  RESERVA_NUEVA: { icon: 'add_home', color: 'text-primary' },
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

/**
 * Ítem 307: tip del día dinámico. Antes era un texto fijo ("40% más de reservas...");
 * ahora se arma una lista de tips CONDICIONALES a partir de las métricas reales del
 * arrendador (nada de rotación ciega ni del catálogo BANNER del backend, que es para el
 * hero público) y se muestra el primero cuya condición aplica, en orden de prioridad
 * (lo más accionable primero). Siempre hay un fallback genérico al final.
 */
function calcularTipDelDia(m: DashboardArrendador): { icon: string; texto: ReactNode } {
  if (m.propiedadesActivas === 0) {
    return {
      icon: 'add_home',
      texto: (
        <>Aún no tienes cuartos activos. <span className="text-primary font-black">Publica el primero</span> para empezar a recibir reservas.</>
      ),
    };
  }
  if (m.vistasUltimos30Dias === 0) {
    return {
      icon: 'photo_camera',
      texto: (
        <>Tus cuartos no tuvieron vistas en 30 días. Sube <span className="text-primary font-black">más fotos y mejora la descripción</span> para aparecer más en las búsquedas.</>
      ),
    };
  }
  if (m.tasaOcupacion < 50) {
    return {
      icon: 'trending_down',
      texto: (
        <>Tu ocupación es de <span className="text-primary font-black">{m.tasaOcupacion.toFixed(0)}%</span>. Revisa que tu precio esté alineado con el de tu zona.</>
      ),
    };
  }
  if (m.reservasPendientes > 0) {
    return {
      icon: 'bolt',
      texto: (
        <>Tienes reservas esperando respuesta. <span className="text-primary font-black">Responder rápido</span> mejora tu posicionamiento y la confianza del estudiante.</>
      ),
    };
  }
  if (m.ingresosMesAnterior > 0 && m.ingresosMesActual > m.ingresosMesAnterior) {
    return {
      icon: 'trending_up',
      texto: (
        <>Tus ingresos subieron respecto al mes pasado. <span className="text-primary font-black">Considera publicar otro cuarto</span> para aprovechar la demanda.</>
      ),
    };
  }
  return {
    icon: 'lightbulb',
    texto: (
      <>Las propiedades con más de 5 fotos reciben <span className="text-primary font-black">más visitas</span> en promedio.</>
    ),
  };
}

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
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [propiedades, setPropiedades] = useState<PropiedadPreview[]>([]);
  const [algunaConDisponibilidad, setAlgunaConDisponibilidad] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      // 305/306/323: se aprovecha esta misma carga para traer el perfil completo (RUC,
      // verificación, nombre/apellido/teléfono/foto) que también necesita el onboarding —
      // evita una segunda llamada aparte en este componente.
      const tareas: Promise<unknown>[] = [
        dashboardService.obtenerMetricas(),
        profileService.obtenerMiPerfil(),
      ];
      if (usuario?.perfilId) {
        tareas.push(propiedadService.obtenerPorArrendador(usuario.perfilId.toString()));
      }
      const [m, p, props] = await Promise.all(tareas);
      setMetricas(m as DashboardArrendador);
      setPerfil(p as Perfil);
      const lista = Array.isArray(props) ? (props as PropiedadPreview[]) : [];
      // Ítem 323: proxy de "ya configuró disponibilidad" — mira la lista COMPLETA (antes
      // de recortarla a las 2 tarjetas que se muestran), no solo las que se renderizan.
      setAlgunaConDisponibilidad(lista.some((x) => !!x.disponibleDesde));
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

  // Ítem 322: delta real de ocupación (puntos porcentuales vs. el mes anterior de la serie
  // histórica del ítem 321) — a diferencia de "Reservas activas"/"Mensajes sin leer", que NO
  // tienen un valor del mes anterior disponible en el backend y por eso no llevan delta.
  const ocupacionPorMes = metricas?.ocupacionPorMes ?? [];
  const deltaOcupacion = ocupacionPorMes.length >= 2
    ? Math.round((ocupacionPorMes[ocupacionPorMes.length - 1].valor - ocupacionPorMes[ocupacionPorMes.length - 2].valor) * 10) / 10
    : null;

  const tipDelDia = metricas ? calcularTipDelDia(metricas) : null;

  // Ítem 323: onboarding del arrendador — clona el patrón de OnboardingBanner (student).
  const onboardingPasosArrendador: OnboardingPaso[] = [
    {
      id: 'verificacion',
      titulo: 'Verifica tu cuenta',
      descripcion: 'Sube tus documentos para obtener el sello de Socio Verificado.',
      href: '/landlord/profile',
      completado: !!perfil?.detallesArrendador?.verificado,
    },
    {
      id: 'perfil',
      titulo: 'Completa tu perfil',
      descripcion: 'Agrega tu teléfono y foto de perfil para generar confianza.',
      href: '/landlord/profile',
      completado: !!(perfil?.nombre && perfil?.apellido && perfil?.telefono && perfil?.fotoUrl),
    },
    {
      id: 'propiedad',
      titulo: 'Publica tu primer cuarto',
      descripcion: 'Sube fotos y detalles de tu primer cuarto disponible.',
      href: '/landlord/properties/add',
      completado: (metricas?.totalPropiedades ?? 0) > 0,
    },
    {
      id: 'disponibilidad',
      titulo: 'Configura la disponibilidad',
      descripcion: 'Indica desde cuándo están disponibles tus cuartos.',
      href: '/landlord/properties/active',
      completado: algunaConDisponibilidad,
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-400 py-4">
      <VerificationPanel />

      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight opacity-90">
            Hola, <span className="text-primary font-bold">{usuario?.nombre.split(' ')[0] || 'Socio'}</span>.
          </h1>
          <p className="text-muted-foreground text-[12px] font-medium mt-0.5 tracking-tight">
            Vistazo rápido de tus operaciones.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="border border-border text-[10px] font-bold"
            onClick={() => cargar()}
          >
            Actualizar
          </Button>
          <Button
            asChild
            variant="primary"
            size="sm"
            className="text-[10px] font-bold px-5"
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

      {/* Ítem 323: onboarding — solo cuando ya cargaron perfil y métricas, para no mostrar
          pasos "incompletos" en falso mientras el fetch está en vuelo. Se auto-oculta cuando
          los 4 pasos ya están completados (lógica ya vive en OnboardingBanner). */}
      {perfil && metricas && <OnboardingBanner pasos={onboardingPasosArrendador} />}

      {error && (
        <div className="p-5 bg-red-500/5 border border-red-500/20 rounded-md flex items-center justify-between gap-4">
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
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Ingresos del mes"
              value={formatearSoles(metricas.ingresosMesActual)}
              delta={tendenciaIngresos}
              icon="payments"
            />
            <StatCard
              label="Ocupación"
              value={`${metricas.tasaOcupacion.toFixed(1)}%`}
              delta={deltaOcupacion}
              deltaLabel={`${metricas.propiedadesActivas} activos`}
              icon="meeting_room"
            />
            <StatCard
              label="Reservas activas"
              value={metricas.reservasActivas.toLocaleString('es-PE')}
              deltaLabel={`${metricas.vistasUltimos30Dias.toLocaleString('es-PE')} vistas`}
              icon="event_available"
            />
            <StatCard
              label="Mensajes sin leer"
              value={metricas.mensajesSinLeer.toLocaleString('es-PE')}
              icon="chat"
            />
          </div>

          {metricas.reservasPendientes > 0 && (
            <Link
              href="/landlord/reservations/active"
              className="flex items-center justify-between gap-4 p-4 rounded-md bg-amber-500/5 border border-amber-500/20 hover:border-amber-500/40 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-amber-500">notifications_active</span>
                <p className="text-sm font-semibold text-amber-700">
                  Tienes <span className="font-bold">{metricas.reservasPendientes}</span> reserva{metricas.reservasPendientes !== 1 ? 's' : ''} esperando tu aprobación.
                </p>
              </div>
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1 shrink-0">
                Revisar
                <span className="material-symbols-outlined text-[16px] group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
              </span>
            </Link>
          )}
        </>
      ) : null}

      {metricas && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card variant="surface" padding="lg" className="border border-border bg-white">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold tracking-tight flex items-center gap-2 opacity-80">
                <span
                  className="material-symbols-outlined text-primary text-[18px]"
                  style={{ fontVariationSettings: "'wght' 300" }}
                >
                  bar_chart
                </span>
                Ingresos por mes
              </h2>
              <span className="text-[9px] font-black text-muted-foreground/70 uppercase tracking-widest">
                Últimos 7 meses
              </span>
            </div>
            <IngresosChart data={metricas.ingresosPorMes} />
          </Card>

          {/* Ítem 321: ocupación histórica — calculada retroactivamente desde reservas
              PAGADA/FINALIZADA (no hay snapshot mensual persistido, ver DashboardServiceImpl). */}
          <Card variant="surface" padding="lg" className="border border-border bg-white">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold tracking-tight flex items-center gap-2 opacity-80">
                <span
                  className="material-symbols-outlined text-primary text-[18px]"
                  style={{ fontVariationSettings: "'wght' 300" }}
                >
                  meeting_room
                </span>
                Ocupación por mes
              </h2>
              <span className="text-[9px] font-black text-muted-foreground/70 uppercase tracking-widest">
                Últimos 7 meses
              </span>
            </div>
            <OcupacionChart data={metricas.ocupacionPorMes} />
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-md font-bold tracking-tight flex items-center gap-2 opacity-80">
              Tus Cuartos
              {metricas && (
                <span className="text-[9px] font-bold text-primary bg-primary/5 border border-primary/15 px-2 py-0.5 rounded uppercase tracking-wider">
                  {metricas.propiedadesActivas} Activos
                </span>
              )}
            </h2>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-primary font-bold text-[10px] uppercase tracking-wider"
            >
              <Link href="/landlord/properties/active">Ver todos</Link>
            </Button>
          </div>

          {cargando && propiedades.length === 0 ? (
            <SkeletonProperties />
          ) : propiedades.length === 0 ? (
            <Card padding="lg" className="border border-dashed border-border bg-white text-center">
              <p className="text-sm font-medium text-muted-foreground mb-4">
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
                  className="group overflow-hidden border border-border hover:border-primary/30 transition-colors duration-200 bg-white"
                >
                  <div className="relative h-44 overflow-hidden bg-muted">
                    {prop.imagenUrl ? (
                      <img
                        src={prop.imagenUrl}
                        className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105"
                        alt={prop.titulo}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                        <span className="material-symbols-outlined text-4xl">image</span>
                      </div>
                    )}
                    <div className="absolute top-4 right-4">
                      <Badge
                        variant="glass"
                        className="bg-white/90 text-foreground border-none shadow-lg text-[11px] font-black"
                      >
                        S/ {Number(prop.precio).toLocaleString('es-PE')}/m
                      </Badge>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-md mb-1 truncate opacity-90">{prop.titulo}</h3>
                    <p className="text-[11px] text-muted-foreground/70 font-medium flex items-center gap-1 mb-5">
                      <span
                        className="material-symbols-outlined text-[14px]"
                        style={{ fontVariationSettings: "'wght' 300" }}
                      >
                        location_on
                      </span>
                      {prop.direccion || 'Lima, Perú'}
                    </p>
                    <div className="flex items-center justify-between pt-5 border-t border-border/60">
                      <Badge
                        variant="surface"
                        className="text-[9px] font-bold uppercase tracking-wider"
                      >
                        {prop.estado || 'PENDIENTE'}
                      </Badge>
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="text-[10px] font-bold uppercase tracking-wider text-primary hover:bg-primary/5 border border-transparent hover:border-primary/20 rounded-md px-4"
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
          <Card variant="surface" padding="lg" className="border border-border bg-white">
            <h2 className="text-sm font-bold tracking-tight mb-6 flex items-center gap-2 opacity-80">
              <span
                className="material-symbols-outlined text-primary text-[18px]"
                style={{ fontVariationSettings: "'wght' 300" }}
              >
                history
              </span>
              Actividad reciente
            </h2>
            {cargando && !metricas ? (
              <SkeletonActivity />
            ) : metricas && metricas.actividadReciente.length > 0 ? (
              <div className="space-y-6">
                {metricas.actividadReciente.slice(0, 6).map((a, i) => (
                  <ActivityRow key={`${a.referenciaId}-${i}`} actividad={a} />
                ))}
              </div>
            ) : (
              <p className="text-xs font-medium text-muted-foreground/70 py-4 text-center">
                Sin actividad reciente.
              </p>
            )}
            <Button
              asChild
              variant="outline"
              className="w-full mt-10 border-border text-[11px] font-bold uppercase tracking-wider py-5"
              size="md"
            >
              <Link href="/landlord/reservations/history">Historial Completo</Link>
            </Button>
          </Card>

          {tipDelDia && (
            <Card
              variant="surface"
              className="bg-primary/5 border border-primary/20 rounded-md p-6"
              padding="none"
            >
              <h2 className="font-bold text-primary text-[10px] mb-2 flex items-center gap-2 uppercase tracking-wider">
                <span
                  className="material-symbols-outlined text-[16px]"
                  style={{ fontVariationSettings: "'wght' 300" }}
                >
                  {tipDelDia.icon}
                </span>
                Tip del día
              </h2>
              <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
                {tipDelDia.texto}
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function ActivityRow({ actividad }: { actividad: ActividadReciente }) {
  const meta = ICONOS_ACTIVIDAD[actividad.tipo] ?? { icon: 'notifications', color: 'text-muted-foreground' };
  return (
    <div className="flex gap-4 group">
      <div
        className={cn(
          'w-9 h-9 rounded-md bg-white flex items-center justify-center shrink-0 border border-border transition-colors group-hover:border-primary/40',
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
        <p className="text-[13px] font-bold text-foreground/90 capitalize">
          {actividad.tipo.replace(/_/g, ' ').toLowerCase()}
        </p>
        <p className="text-[11px] text-muted-foreground/70 font-medium truncate mt-0.5">
          {actividad.descripcion}
        </p>
        <p className="text-[9px] text-muted-foreground/40 font-black uppercase mt-1.5 tracking-widest">
          {actividad.fecha ? formatearFechaRelativa(actividad.fecha) : ''}
        </p>
      </div>
    </div>
  );
}

function SkeletonStats() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[0, 1, 2, 3].map((i) => (
        <StatCardSkeleton key={i} />
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
          className="bg-white border border-border rounded-md h-72 animate-pulse"
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
          <div className="w-9 h-9 rounded-md bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
            <div className="h-3 w-3/4 bg-muted rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
