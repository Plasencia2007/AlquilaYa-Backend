'use client';

import { useCallback, useEffect, useState } from 'react';
import { habitacionService } from '@/services/habitacion-service';
import { notify } from '@/lib/notify';
import { ImageUploader, type StagedImage } from '@/components/ui/image-uploader';
import type { EstadoHabitacion, Habitacion } from '@/types/propiedad';

const ESTADOS: EstadoHabitacion[] = ['LIBRE', 'RESERVADA', 'OCUPADA', 'MANTENIMIENTO'];

/** Máximo de fotos por habitación (consistente con el backend, `HabitacionController`). */
const MAX_ROOM_IMAGES = 8;

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
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [stagedByRoom, setStagedByRoom] = useState<Record<number, StagedImage[]>>({});
  const [photoBusyId, setPhotoBusyId] = useState<number | null>(null);

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

  const toggleFotos = (id: number) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const subirFotos = async (h: Habitacion) => {
    const files = (stagedByRoom[h.id] ?? [])
      .filter((s) => s.status === 'ready')
      .map((s) => s.file);
    if (files.length === 0) return;
    setPhotoBusyId(h.id);
    try {
      await habitacionService.subirImagenes(propiedadId, h.id, files);
      setStagedByRoom((prev) => ({ ...prev, [h.id]: [] }));
      notify.success('Fotos subidas');
      cargar();
    } catch (e) {
      notify.error(e, 'No se pudieron subir las fotos');
    } finally {
      setPhotoBusyId(null);
    }
  };

  const eliminarFoto = async (h: Habitacion, url: string) => {
    setPhotoBusyId(h.id);
    try {
      await habitacionService.eliminarImagen(propiedadId, h.id, url);
      cargar();
    } catch (e) {
      notify.error(e, 'No se pudo eliminar la foto');
    } finally {
      setPhotoBusyId(null);
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
          {rooms.map((h) => {
            const fotos = h.imagenes ?? [];
            const staged = stagedByRoom[h.id] ?? [];
            const expandido = expandedIds.has(h.id);
            return (
              <div key={h.id} className="space-y-2 rounded-lg border border-border bg-card p-2">
                <div className="grid grid-cols-12 items-center gap-2">
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
                      className="flex h-11 w-11 items-center justify-center rounded-md text-primary hover:bg-primary/10 disabled:opacity-50"
                      title="Guardar"
                      aria-label={`Guardar ${h.nombre || 'habitación'}`}
                    >
                      <span className="material-symbols-outlined text-[18px]">save</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => eliminar(h)}
                      disabled={busyId === h.id}
                      className="flex h-11 w-11 items-center justify-center rounded-md text-destructive hover:bg-destructive/10 disabled:opacity-50"
                      title="Eliminar"
                      aria-label={`Eliminar ${h.nombre || 'habitación'}`}
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleFotos(h.id)}
                  className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary"
                >
                  <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                  Fotos ({fotos.length})
                  <span className="material-symbols-outlined text-[16px]">
                    {expandido ? 'expand_less' : 'expand_more'}
                  </span>
                </button>

                {expandido && (
                  <div className="space-y-3 rounded-lg bg-muted/50 p-3">
                    {fotos.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                        {fotos.map((url) => (
                          <div
                            key={url}
                            className="group relative aspect-square overflow-hidden rounded-md border border-border"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="Foto de la habitación" className="h-full w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => eliminarFoto(h, url)}
                              disabled={photoBusyId === h.id}
                              title="Eliminar foto"
                              aria-label="Eliminar foto de la habitación"
                              className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-50"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <ImageUploader
                      images={staged}
                      onImagesChange={(imgs) => setStagedByRoom((prev) => ({ ...prev, [h.id]: imgs }))}
                      remainingSlots={Math.max(0, MAX_ROOM_IMAGES - fotos.length - staged.length)}
                    />

                    <button
                      type="button"
                      onClick={() => subirFotos(h)}
                      disabled={photoBusyId === h.id || staged.every((s) => s.status !== 'ready')}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      Subir fotos
                    </button>
                  </div>
                )}
              </div>
            );
          })}
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
