'use client';

import { useCallback, useEffect, useState } from 'react';
import { habitacionService } from '@/services/habitacion-service';
import { notify } from '@/lib/notify';
import type { EstadoHabitacion, Habitacion } from '@/types/propiedad';

const ESTADOS: EstadoHabitacion[] = ['LIBRE', 'RESERVADA', 'OCUPADA', 'MANTENIMIENTO'];

/**
 * Editor de habitaciones de una propiedad gestionada por habitaciones: agregar, editar
 * (nombre/precio/estado) y eliminar. Cada cuarto se guarda por separado contra el backend.
 */
export function RoomManager({ propiedadId }: { propiedadId: number | string }) {
  const [rooms, setRooms] = useState<Habitacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [busyId, setBusyId] = useState<number | 'new' | null>(null);

  const cargar = useCallback(() => {
    setLoading(true);
    habitacionService
      .listar(propiedadId)
      .then(setRooms)
      .catch(() => setRooms([]))
      .finally(() => setLoading(false));
  }, [propiedadId]);

  useEffect(() => { cargar(); }, [cargar]);

  const setField = (id: number, field: keyof Habitacion, value: unknown) =>
    setRooms((rs) => rs.map((r) => (r.id === id ? { ...r, [field]: value } : r)));

  const agregar = async () => {
    const p = parseFloat(precio);
    if (!nombre.trim() || Number.isNaN(p) || p <= 0) {
      notify.error(null, 'Indica un nombre y un precio mayor a 0');
      return;
    }
    setBusyId('new');
    try {
      await habitacionService.crear(propiedadId, { nombre: nombre.trim(), precio: p });
      setNombre(''); setPrecio(''); cargar();
    } catch (e) {
      notify.error(e, 'No se pudo agregar la habitación');
    } finally {
      setBusyId(null);
    }
  };

  const guardar = async (h: Habitacion) => {
    const p = Number(h.precio);
    if (!h.nombre.trim() || Number.isNaN(p) || p <= 0) {
      notify.error(null, 'Nombre y precio (> 0) son obligatorios');
      return;
    }
    setBusyId(h.id);
    try {
      await habitacionService.actualizar(propiedadId, h.id, {
        nombre: h.nombre.trim(),
        precio: p,
        estado: h.estado,
        area: h.area ?? undefined,
        descripcion: h.descripcion ?? undefined,
      });
      notify.success('Habitación actualizada');
    } catch (e) {
      notify.error(e, 'No se pudo guardar la habitación');
    } finally {
      setBusyId(null);
    }
  };

  const eliminar = async (h: Habitacion) => {
    setBusyId(h.id);
    try {
      await habitacionService.eliminar(propiedadId, h.id);
      cargar();
    } catch (e) {
      notify.error(e, 'No se pudo eliminar la habitación');
    } finally {
      setBusyId(null);
    }
  };

  const inputCls =
    'w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary';

  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Habitaciones</p>

      {loading ? (
        <div className="h-16 animate-pulse rounded-lg bg-muted" />
      ) : rooms.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aún no agregaste habitaciones.</p>
      ) : (
        <div className="space-y-2">
          {rooms.map((h) => (
            <div key={h.id} className="grid grid-cols-12 items-center gap-2 rounded-lg border border-border bg-card p-2">
              <input
                className={`${inputCls} col-span-4`}
                value={h.nombre}
                onChange={(e) => setField(h.id, 'nombre', e.target.value)}
                placeholder="Cuarto 1"
              />
              <input
                type="number"
                min={0}
                className={`${inputCls} col-span-3`}
                value={h.precio}
                onChange={(e) => setField(h.id, 'precio', e.target.value)}
                placeholder="Precio"
              />
              <select
                className={`${inputCls} col-span-3`}
                value={h.estado}
                onChange={(e) => setField(h.id, 'estado', e.target.value as EstadoHabitacion)}
              >
                {ESTADOS.map((es) => <option key={es} value={es}>{es}</option>)}
              </select>
              <div className="col-span-2 flex justify-end gap-1">
                <button
                  type="button"
                  onClick={() => guardar(h)}
                  disabled={busyId === h.id}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-primary hover:bg-primary/10 disabled:opacity-50"
                  title="Guardar"
                >
                  <span className="material-symbols-outlined text-[18px]">save</span>
                </button>
                <button
                  type="button"
                  onClick={() => eliminar(h)}
                  disabled={busyId === h.id}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-destructive hover:bg-destructive/10 disabled:opacity-50"
                  title="Eliminar"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Agregar habitación */}
      <div className="grid grid-cols-12 items-center gap-2 border-t border-border pt-3">
        <input
          className={`${inputCls} col-span-5`}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre (ej. Cuarto 1)"
        />
        <input
          type="number"
          min={0}
          className={`${inputCls} col-span-4`}
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
          placeholder="Precio S/"
        />
        <button
          type="button"
          onClick={agregar}
          disabled={busyId === 'new'}
          className="col-span-3 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          Agregar
        </button>
      </div>
    </div>
  );
}
