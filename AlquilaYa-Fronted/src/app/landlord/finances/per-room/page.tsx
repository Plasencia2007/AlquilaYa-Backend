'use client';

import { useEffect, useMemo, useState } from 'react';

import { Card } from '@/components/ui/legacy-card';
import { useAuth } from '@/hooks/use-auth';
import { notify } from '@/lib/notify';
import { propiedadService } from '@/services/landlord-property-service';
import { reservationService } from '@/services/reservation-service';
import type { Reserva } from '@/types/reserva';

interface FilaPropiedad {
  propiedadId: string;
  titulo: string;
  reservas: number;
  total: number;
  promedio: number;
}

function formatearMoneda(n: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    maximumFractionDigits: 0,
  }).format(n);
}

interface PropiedadBackend {
  id: number | string;
  titulo: string;
}

export default function LandlordFinancesPerRoomPage() {
  const { usuario } = useAuth();
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [titulos, setTitulos] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    if (!usuario?.perfilId) return;

    setCargando(true);
    Promise.all([
      reservationService.listarComoArrendador('PAGADA'),
      propiedadService.obtenerPorArrendador(String(usuario.perfilId)).catch(() => [] as PropiedadBackend[]),
    ])
      .then(([listaReservas, listaPropiedades]) => {
        if (cancelado) return;
        setReservas(listaReservas);
        const mapa: Record<string, string> = {};
        for (const p of listaPropiedades as PropiedadBackend[]) {
          mapa[String(p.id)] = p.titulo;
        }
        setTitulos(mapa);
      })
      .catch((err) => notify.error(err, 'No se pudieron cargar las finanzas'))
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [usuario?.perfilId]);

  const filas = useMemo<FilaPropiedad[]>(() => {
    const mapa = new Map<string, FilaPropiedad>();
    for (const r of reservas) {
      const id = String(r.propiedadId);
      const fila = mapa.get(id) ?? {
        propiedadId: id,
        titulo: titulos[id] ?? r.propiedadTitulo ?? `Propiedad #${id}`,
        reservas: 0,
        total: 0,
        promedio: 0,
      };
      fila.reservas += 1;
      fila.total += Number(r.montoTotal ?? 0);
      // Mantener el título más fresco (cuando llega del catálogo)
      if (titulos[id]) fila.titulo = titulos[id];
      mapa.set(id, fila);
    }
    const arr = Array.from(mapa.values()).map((f) => ({
      ...f,
      promedio: f.reservas > 0 ? f.total / f.reservas : 0,
    }));
    arr.sort((a, b) => b.total - a.total);
    return arr;
  }, [reservas, titulos]);

  const total = useMemo(() => filas.reduce((acc, f) => acc + f.total, 0), [filas]);

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-black text-on-surface tracking-tighter opacity-90">
            Ingresos por propiedad
          </h1>
          <p className="text-on-surface-variant text-[12px] font-medium mt-0.5 tracking-tight">
            Comparativo de cuánto está aportando cada habitación o propiedad.
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">
            Total general
          </p>
          <p className="text-3xl font-black text-blue-500">{formatearMoneda(total)}</p>
        </div>
      </header>

      <Card padding="none" className="bg-white/40 border border-on-surface/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-on-surface/5 text-on-surface-variant text-[10px] uppercase tracking-widest">
            <tr>
              <th className="text-left px-6 py-3 font-black">Propiedad</th>
              <th className="text-right px-6 py-3 font-black">Reservas</th>
              <th className="text-right px-6 py-3 font-black">Total</th>
              <th className="text-right px-6 py-3 font-black">Promedio</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.propiedadId} className="border-t border-on-surface/5">
                <td className="px-6 py-3 font-bold text-on-surface/80">{f.titulo}</td>
                <td className="px-6 py-3 text-right font-medium">{f.reservas}</td>
                <td className="px-6 py-3 text-right font-black text-blue-600">
                  {formatearMoneda(f.total)}
                </td>
                <td className="px-6 py-3 text-right font-medium">
                  {formatearMoneda(f.promedio)}
                </td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-6 text-center text-on-surface-variant">
                  {cargando ? 'Cargando…' : 'Aún no tienes ingresos registrados.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
