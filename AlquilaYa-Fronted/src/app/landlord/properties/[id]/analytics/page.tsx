'use client';

import { use, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Eye,
  Heart,
  Lightbulb,
  MessageCircle,
  CalendarCheck,
  TriangleAlert,
} from 'lucide-react';

import { analyticsService, type AnaliticaPropiedad } from '@/services/analytics-service';
import { notify } from '@/lib/notify';

const VistasChart = dynamic(() => import('@/components/landlord/VistasChart'), { ssr: false });

const POSICION_INFO: Record<string, { label: string; cls: string }> = {
  BAJO: { label: 'Por debajo del promedio', cls: 'bg-emerald-100 text-emerald-700' },
  PROMEDIO: { label: 'En el promedio de la zona', cls: 'bg-blue-100 text-blue-700' },
  ALTO: { label: 'Por encima del promedio', cls: 'bg-amber-100 text-amber-700' },
};

function StatCard({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <p className="mt-1.5 text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}

function FunnelRow({
  label,
  value,
  max,
  prev,
  color,
  icon,
}: {
  label: string;
  value: number;
  max: number;
  prev: number | null;
  color: string;
  icon: React.ReactNode;
}) {
  const width = max > 0 ? Math.max(4, (value / max) * 100) : 4;
  const conv = prev && prev > 0 ? Math.round((value / prev) * 100) : null;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="flex items-center gap-1.5 font-bold text-slate-700">
          {icon}
          {label}
        </span>
        <span className="font-black text-slate-900">
          {value}
          {conv !== null && <span className="ml-1.5 text-[10px] font-bold text-slate-400">{conv}%</span>}
        </span>
      </div>
      <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${width}%`, background: color }} />
      </div>
    </div>
  );
}

export default function PropertyAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const titulo = searchParams.get('titulo') ?? 'tu aviso';

  const [data, setData] = useState<AnaliticaPropiedad | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    analyticsService
      .obtener(id)
      .then((d) => !cancelado && setData(d))
      .catch((err) => {
        if (!cancelado) notify.error(err, 'No se pudo cargar la analítica');
      })
      .finally(() => !cancelado && setLoading(false));
    return () => {
      cancelado = true;
    };
  }, [id]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link
        href="/landlord/properties/active"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 mb-4"
      >
        <ArrowLeft className="size-4" /> Mis propiedades
      </Link>

      <header className="mb-6">
        <h1 className="text-xl font-black text-slate-900 tracking-tight">Analítica</h1>
        <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">{titulo}</p>
      </header>

      {loading ? (
        <div className="space-y-4">
          <div className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
          <div className="h-60 rounded-2xl bg-slate-100 animate-pulse" />
          <div className="h-40 rounded-2xl bg-slate-100 animate-pulse" />
        </div>
      ) : !data ? (
        <p className="text-sm text-slate-400">No hay datos de analítica todavía.</p>
      ) : (
        <div className="space-y-6">
          {/* #55 — alerta sin reservas */}
          {data.alertaSinReservas && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4">
              <TriangleAlert className="size-5 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-bold text-amber-800">
                  {data.diasUltimaReserva != null
                    ? `${data.diasUltimaReserva} días sin reservas`
                    : 'Aún sin reservas'}
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Revisa las sugerencias de abajo para reactivar el interés en tu aviso.
                </p>
              </div>
            </div>
          )}

          {/* #51 — vistas por ventana */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="grid grid-cols-3 gap-3 mb-5">
              <StatCard label="Vistas 7 días" value={data.vistas7} icon={<Eye className="size-4" />} />
              <StatCard label="Vistas 30 días" value={data.vistas30} icon={<Eye className="size-4" />} />
              <StatCard label="Vistas totales" value={data.vistasTotal} icon={<Eye className="size-4" />} />
            </div>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
              Vistas por día (últimos 30)
            </h2>
            <VistasChart data={data.vistasPorDia} />
          </section>

          {/* #52 — embudo */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">
              Embudo de conversión
            </h2>
            <FunnelRow
              label="Vistas"
              value={data.embudo.vistas}
              max={data.embudo.vistas}
              prev={null}
              color="#8f0304"
              icon={<Eye className="size-3.5" />}
            />
            <FunnelRow
              label="Favoritos"
              value={data.embudo.favoritos}
              max={data.embudo.vistas}
              prev={data.embudo.vistas}
              color="#c2410c"
              icon={<Heart className="size-3.5" />}
            />
            <FunnelRow
              label="Contactos"
              value={data.embudo.contactos}
              max={data.embudo.vistas}
              prev={data.embudo.favoritos}
              color="#0369a1"
              icon={<MessageCircle className="size-3.5" />}
            />
            <FunnelRow
              label="Reservas"
              value={data.embudo.reservas}
              max={data.embudo.vistas}
              prev={data.embudo.contactos}
              color="#15803d"
              icon={<CalendarCheck className="size-3.5" />}
            />
            <p className="text-[11px] text-slate-400">
              El % es la conversión respecto al paso anterior.
            </p>
          </section>

          {/* #53 — precio vs zona */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
              Tu precio vs la zona
            </h2>
            {data.precioVsZona ? (
              <PrecioVsZona pz={data.precioVsZona} />
            ) : (
              <p className="text-sm text-slate-400">
                Aún no hay suficientes avisos comparables en tu zona.
              </p>
            )}
          </section>

          {/* #54 — sugerencias */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
              Sugerencias para mejorar
            </h2>
            {data.sugerencias.length === 0 ? (
              <p className="text-sm font-semibold text-emerald-700">
                🎉 Tu aviso se ve completo. ¡Buen trabajo!
              </p>
            ) : (
              <ul className="space-y-2.5">
                {data.sugerencias.map((s, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <Lightbulb className="size-4 shrink-0 mt-0.5 text-amber-500" />
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function PrecioVsZona({ pz }: { pz: NonNullable<AnaliticaPropiedad['precioVsZona']> }) {
  const info = POSICION_INFO[pz.posicion] ?? POSICION_INFO.PROMEDIO;
  const min = pz.min ?? pz.precio;
  const max = pz.max ?? pz.precio;
  const span = max - min;
  const pos = (v: number) => (span > 0 ? ((v - min) / span) * 100 : 50);

  const soles = (n: number) => `S/ ${Number(n).toLocaleString('es-PE')}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-2xl font-black text-slate-900">{soles(pz.precio)}</p>
          <p className="text-xs text-slate-400">
            Promedio de la zona: <span className="font-bold text-slate-600">{soles(pz.promedio)}</span>
          </p>
        </div>
        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${info.cls}`}>{info.label}</span>
      </div>

      {span > 0 && (
        <div className="relative h-2 rounded-full bg-slate-100 mt-8 mb-2">
          {/* promedio marker */}
          <div
            className="absolute -top-1 w-0.5 h-4 bg-slate-400"
            style={{ left: `${pos(pz.promedio)}%` }}
            title="Promedio"
          />
          {/* tu precio marker */}
          <div
            className="absolute -top-6 -translate-x-1/2 flex flex-col items-center"
            style={{ left: `${Math.min(100, Math.max(0, pos(pz.precio)))}%` }}
          >
            <span className="text-[10px] font-black text-primary whitespace-nowrap">Tú</span>
            <div className="w-3 h-3 rounded-full bg-primary border-2 border-white shadow" />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400">
        <span>{soles(min)}</span>
        <span>{pz.cantidad} avisos comparables</span>
        <span>{soles(max)}</span>
      </div>
    </div>
  );
}
