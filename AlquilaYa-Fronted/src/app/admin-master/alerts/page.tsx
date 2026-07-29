'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Clock,
  FileWarning,
  Flag,
  RefreshCw,
  ShieldAlert,
  Wallet,
} from 'lucide-react';

import { StatCard } from '@/components/shared/stat-card';
import { adminPropertyService, PropiedadAdminDTO } from '@/services/admin-property-service';
import { adminDenunciaService } from '@/services/admin-denuncia-service';
import { adminModerationService, DocumentoAdmin } from '@/services/admin-moderation-service';
import { adminPagoService, PagoFallido } from '@/services/pago-service';
import { adminSecurityService, SecurityEventAdmin } from '@/services/admin-security-service';

const HORAS_UMBRAL_PENDIENTE = 48;
const DIAS_VENTANA_SEGURIDAD = 7;

const formatearFecha = (iso?: string | null) => {
  if (!iso) return '—';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '—';
  return fecha.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatearSoles = (valor?: number | null) => `S/ ${Number(valor || 0).toLocaleString('es-PE')}`;

const horasDesde = (iso?: string | null): number | null => {
  if (!iso) return null;
  const fecha = new Date(iso).getTime();
  if (Number.isNaN(fecha)) return null;
  return (Date.now() - fecha) / (1000 * 60 * 60);
};

/** Ítem 351: intenta mostrar el detalle del evento de seguridad de forma legible. */
function resumenDetalleSeguridad(detalle: string | null): string {
  if (!detalle) return 'Sin detalle';
  try {
    const data = JSON.parse(detalle) as Record<string, unknown>;
    const partes: string[] = [];
    if (data.correo) partes.push(String(data.correo));
    if (data.ip) partes.push(`IP ${data.ip}`);
    return partes.length > 0 ? partes.join(' · ') : detalle;
  } catch {
    return detalle;
  }
}

interface EstadoCarga<T> {
  data: T;
  loading: boolean;
}

export default function AlertsPage() {
  const [pendientes, setPendientes] = useState<EstadoCarga<PropiedadAdminDTO[]>>({ data: [], loading: true });
  const [denunciasPendientes, setDenunciasPendientes] = useState<EstadoCarga<number>>({ data: 0, loading: true });
  const [documentos, setDocumentos] = useState<EstadoCarga<DocumentoAdmin[]>>({ data: [], loading: true });
  const [pagosFallidos, setPagosFallidos] = useState<EstadoCarga<PagoFallido[]>>({ data: [], loading: true });
  const [eventosSeguridad, setEventosSeguridad] = useState<EstadoCarga<{ items: SecurityEventAdmin[]; total: number }>>({
    data: { items: [], total: 0 },
    loading: true,
  });

  const aplicarResultados = ([pend, den, docs, pagos, seg]: [
    PromiseSettledResult<PropiedadAdminDTO[]>,
    PromiseSettledResult<{ totalElements: number }>,
    PromiseSettledResult<DocumentoAdmin[]>,
    PromiseSettledResult<PagoFallido[]>,
    PromiseSettledResult<{ content: SecurityEventAdmin[]; totalElements: number }>,
  ]) => {
    setPendientes({
      data: pend.status === 'fulfilled' && Array.isArray(pend.value) ? pend.value : [],
      loading: false,
    });
    setDenunciasPendientes({
      data: den.status === 'fulfilled' ? den.value.totalElements : 0,
      loading: false,
    });
    setDocumentos({
      data: docs.status === 'fulfilled' && Array.isArray(docs.value) ? docs.value : [],
      loading: false,
    });
    setPagosFallidos({
      data: pagos.status === 'fulfilled' && Array.isArray(pagos.value) ? pagos.value : [],
      loading: false,
    });
    setEventosSeguridad({
      data: seg.status === 'fulfilled' ? { items: seg.value.content, total: seg.value.totalElements } : { items: [], total: 0 },
      loading: false,
    });
  };

  const pedirDatos = () => {
    const desdeSeguridad = new Date(Date.now() - DIAS_VENTANA_SEGURIDAD * 24 * 60 * 60 * 1000).toISOString();
    return Promise.allSettled([
      adminPropertyService.listarPendientes(),
      adminDenunciaService.listar('PENDIENTE', 0, 1),
      adminModerationService.getDocumentosPendientes(),
      adminPagoService.listarPagosFallidos(),
      adminSecurityService.listar(desdeSeguridad, 0, 20),
    ]);
  };

  // Botón "Actualizar": SÍ resetea `loading` antes de pedir de nuevo (fuera de un efecto,
  // es un click handler normal, no viola la regla).
  const cargar = () => {
    setPendientes((s) => ({ ...s, loading: true }));
    setDenunciasPendientes((s) => ({ ...s, loading: true }));
    setDocumentos((s) => ({ ...s, loading: true }));
    setPagosFallidos((s) => ({ ...s, loading: true }));
    setEventosSeguridad((s) => ({ ...s, loading: true }));
    pedirDatos().then(aplicarResultados);
  };

  // Carga inicial: el `.then()` va INLINE en el efecto (no delegado a una función con
  // nombre) — los 5 estados ya arrancan en `loading: true` en su `useState`, así que no
  // hace falta resetear nada antes de pedir. Ver nota de `react-hooks/set-state-in-effect`
  // en otros archivos de este batch: llamar a una función con nombre desde el efecto, aunque
  // esa función no haga ningún setState síncrono, el linter la sigue marcando — solo la
  // cadena `.then()` literal dentro del cuerpo del efecto lo satisface.
  useEffect(() => {
    let cancelado = false;
    pedirDatos().then((resultados) => {
      if (!cancelado) aplicarResultados(resultados);
    });
    return () => {
      cancelado = true;
    };
  }, []);

  const cargando =
    pendientes.loading || denunciasPendientes.loading || documentos.loading || pagosFallidos.loading || eventosSeguridad.loading;

  const propiedadesAtrasadas = pendientes.data.filter((p) => {
    const horas = horasDesde(p.fechaCreacion);
    return horas !== null && horas > HORAS_UMBRAL_PENDIENTE;
  });

  const valor = (n: number) => (cargando ? '—' : n.toLocaleString('es-PE'));

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <span className="text-primary font-bold tracking-wider uppercase text-[10px] mb-2 block">Torre de Control</span>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight leading-none">Alertas del sistema</h1>
          <p className="text-slate-400 font-semibold text-xs mt-2">
            5 señales que requieren atención de un administrador, compuestas en el navegador a partir de cada microservicio.
          </p>
        </div>
        <button
          onClick={cargar}
          className="px-4 py-2.5 rounded-md bg-white border border-slate-200 text-slate-600 font-bold text-[11px] uppercase tracking-wider hover:bg-slate-50 transition-colors flex items-center gap-2"
        >
          <RefreshCw size={14} className={cargando ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* 5 fuentes de alerta */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-10">
        <StatCard
          icon={Clock}
          label="Pendientes > 48h"
          value={valor(propiedadesAtrasadas.length)}
          deltaLabel="propiedades sin revisar"
          accent={propiedadesAtrasadas.length > 0 ? 'warning' : 'primary'}
          href="/admin-master/properties/to-review"
        />
        <StatCard
          icon={Flag}
          label="Denuncias"
          value={valor(denunciasPendientes.data)}
          deltaLabel="pendientes de revisión"
          accent={denunciasPendientes.data > 0 ? 'warning' : 'primary'}
          href="/admin-master/reports/listings"
        />
        <StatCard
          icon={FileWarning}
          label="Documentos KYC"
          value={valor(documentos.data.length)}
          deltaLabel="esperando validación"
          accent={documentos.data.length > 0 ? 'warning' : 'primary'}
          href="/admin-master/validations/providers"
        />
        <StatCard
          icon={Wallet}
          label="Pagos fallidos"
          value={valor(pagosFallidos.data.length)}
          deltaLabel="rechazados / en discrepancia"
          accent={pagosFallidos.data.length > 0 ? 'warning' : 'primary'}
          href="#pagos-fallidos"
        />
        <StatCard
          icon={ShieldAlert}
          label="Eventos de seguridad"
          value={valor(eventosSeguridad.data.total)}
          deltaLabel={`últimos ${DIAS_VENTANA_SEGURIDAD} días`}
          accent={eventosSeguridad.data.total > 0 ? 'warning' : 'primary'}
          href="#eventos-seguridad"
        />
      </div>

      {/* Detalle: pagos fallidos (sin sección propia en el panel admin todavía) */}
      <div id="pagos-fallidos" className="bg-white rounded-md border border-slate-200 overflow-hidden mb-6 scroll-mt-6">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/60">
          <div className="flex items-center gap-2">
            <Wallet size={16} className="text-slate-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Pagos fallidos</h2>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                Estado RECHAZADO, DISCREPANCIA o PENDIENTE_REVISION
              </p>
            </div>
          </div>
          <Link
            href="/admin-master/finance/balance"
            className="px-4 py-1.5 rounded-md border border-slate-200 text-[11px] font-bold text-slate-500 hover:bg-slate-50 hover:text-primary transition-colors uppercase tracking-wider"
          >
            Ver finanzas
          </Link>
        </div>

        {pagosFallidos.loading ? (
          <div className="px-6 py-8 text-center text-xs text-slate-400 font-semibold uppercase tracking-wider">Cargando…</div>
        ) : pagosFallidos.data.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <span className="material-symbols-outlined text-3xl text-slate-300">task_alt</span>
            <p className="text-sm font-semibold text-slate-500 mt-2">No hay pagos fallidos.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-bold uppercase tracking-wider bg-slate-50/40">
                  <th className="px-6 py-3">Reserva</th>
                  <th className="px-6 py-3">Estudiante</th>
                  <th className="px-6 py-3">Monto</th>
                  <th className="px-6 py-3">Estado</th>
                  <th className="px-6 py-3">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pagosFallidos.data.slice(0, 10).map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-3 text-[13px] font-semibold text-slate-700">#{p.reservaId}</td>
                    <td className="px-6 py-3 text-[13px] text-slate-600">{p.estudianteId ?? '—'}</td>
                    <td className="px-6 py-3 text-[13px] font-bold text-slate-700">{formatearSoles(p.monto)}</td>
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border bg-destructive/5 text-destructive border-destructive/10">
                        {p.estado}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-[11px] text-slate-400 font-medium">{formatearFecha(p.fechaCreacion)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detalle: eventos de seguridad (sin sección propia en el panel admin todavía) */}
      <div id="eventos-seguridad" className="bg-white rounded-md border border-slate-200 overflow-hidden scroll-mt-6">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/60">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-slate-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Eventos de seguridad</h2>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                Bloqueos de cuenta por intentos de login fallidos (topic Kafka user-security-events)
              </p>
            </div>
          </div>
        </div>

        {eventosSeguridad.loading ? (
          <div className="px-6 py-8 text-center text-xs text-slate-400 font-semibold uppercase tracking-wider">Cargando…</div>
        ) : eventosSeguridad.data.items.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <AlertTriangle className="mx-auto text-slate-300" size={32} />
            <p className="text-sm font-semibold text-slate-500 mt-2">
              Sin eventos de seguridad en los últimos {DIAS_VENTANA_SEGURIDAD} días.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-bold uppercase tracking-wider bg-slate-50/40">
                  <th className="px-6 py-3">Tipo</th>
                  <th className="px-6 py-3">Usuario</th>
                  <th className="px-6 py-3">Detalle</th>
                  <th className="px-6 py-3">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {eventosSeguridad.data.items.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-3 text-[13px] font-semibold text-slate-700">{e.tipo}</td>
                    <td className="px-6 py-3 text-[13px] text-slate-600">{e.usuarioId ?? '—'}</td>
                    <td className="px-6 py-3 text-[12px] text-slate-500">{resumenDetalleSeguridad(e.detalle)}</td>
                    <td className="px-6 py-3 text-[11px] text-slate-400 font-medium">{formatearFecha(e.fecha)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
