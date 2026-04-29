'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/legacy-badge';
import { Button } from '@/components/ui/legacy-button';
import { Card } from '@/components/ui/legacy-card';
import { propiedadService } from '@/services/landlord-property-service';
import { useAuthStore } from '@/stores/auth-store';
import { notify } from '@/lib/notify';
import type { PropiedadBackend, PropiedadImagen } from '@/types/propiedad';

type ImagenItem = { id: number; url: string; orden: number };

export default function GalleryPage() {
  const { usuario } = useAuthStore();
  const [propiedades, setPropiedades] = useState<PropiedadBackend[]>([]);
  const [propiedadId, setPropiedadId] = useState<string>('');
  const [imagenes, setImagenes] = useState<ImagenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    const cargar = async () => {
      if (!usuario?.perfilId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const data = await propiedadService.obtenerPorArrendador(String(usuario.perfilId));
        setPropiedades(data);
        if (data.length > 0) {
          setPropiedadId(String(data[0].id));
          aplicarImagenes(data[0]);
        }
      } catch (err) {
        notify.error(err, 'No se pudieron cargar tus propiedades');
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [usuario?.perfilId]);

  const aplicarImagenes = (prop: PropiedadBackend) => {
    const imgs: ImagenItem[] = (prop.imagenes ?? [])
      .slice()
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
      .map((i: PropiedadImagen) => ({
        id: i.id,
        url: i.url,
        orden: i.orden ?? 0,
      }));
    setImagenes(imgs);
  };

  const handleSelect = (id: string) => {
    setPropiedadId(id);
    const prop = propiedades.find((p) => String(p.id) === id);
    if (prop) aplicarImagenes(prop);
  };

  const refrescar = async () => {
    if (!usuario?.perfilId) return;
    const data = await propiedadService.obtenerPorArrendador(String(usuario.perfilId));
    setPropiedades(data);
    const actual = data.find((p) => String(p.id) === propiedadId);
    if (actual) aplicarImagenes(actual);
  };

  const handleAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!propiedadId) return;
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    try {
      setBusy(true);
      await propiedadService.subirImagenes(propiedadId, files);
      notify.success(`${files.length} imagen(es) subida(s)`);
      await refrescar();
    } catch (err) {
      notify.error(err, 'No se pudieron subir las imágenes');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (img: ImagenItem) => {
    if (!propiedadId) return;
    if (!confirm('¿Eliminar esta imagen?')) return;
    try {
      setBusy(true);
      await propiedadService.eliminarImagen(propiedadId, img.id);
      notify.success('Imagen eliminada');
      await refrescar();
    } catch (err) {
      notify.error(err, 'No se pudo eliminar la imagen');
    } finally {
      setBusy(false);
    }
  };

  // Drag-drop reorder local. TODO: el backend actual no expone endpoint para
  // persistir el orden (PUT /propiedades/{id}/imagenes/orden); solo se reordena
  // en pantalla. Cuando exista endpoint, sincronizar aquí.
  const handleDragStart = (idx: number) => setDragIndex(idx);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (idx: number) => {
    if (dragIndex === null || dragIndex === idx) {
      setDragIndex(null);
      return;
    }
    setImagenes((prev) => {
      const next = prev.slice();
      const [moved] = next.splice(dragIndex, 1);
      next.splice(idx, 0, moved);
      return next.map((it, i) => ({ ...it, orden: i }));
    });
    setDragIndex(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] animate-pulse">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-on-surface-variant font-medium">Cargando galería...</p>
      </div>
    );
  }

  if (!propiedades.length) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center animate-fade-in">
        <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center text-primary mx-auto mb-4">
          <span className="material-symbols-outlined text-4xl">photo_library</span>
        </div>
        <h1 className="text-2xl font-black text-on-surface mb-2">No tienes propiedades aún</h1>
        <p className="text-on-surface-variant mb-6">
          Publica una propiedad primero para gestionar su galería.
        </p>
        <Button asChild variant="dark">
          <Link href="/landlord/properties/add">Publicar propiedad</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 animate-fade-in">
      <div className="mb-8">
        <Badge variant="surface" className="mb-2">
          Galería
        </Badge>
        <h1 className="text-4xl font-black text-on-surface tracking-tighter">
          Gestión de <span className="text-primary">imágenes</span>
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-lg">
          Sube, elimina y reordena las fotos de tus propiedades.
        </p>
      </div>

      <Card className="border-none shadow-sm bg-surface-container-low mb-6">
        <label className="text-sm font-medium text-on-surface-variant block mb-2">
          Propiedad
        </label>
        <select
          value={propiedadId}
          onChange={(e) => handleSelect(e.target.value)}
          className="w-full rounded-2xl bg-surface border border-outline-variant/20 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {propiedades.map((p) => (
            <option key={p.id} value={String(p.id)}>
              {p.titulo}
            </option>
          ))}
        </select>
      </Card>

      <Card className="border-none shadow-sm bg-surface-container-low">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-black text-on-surface">
              {imagenes.length} {imagenes.length === 1 ? 'imagen' : 'imágenes'}
            </h2>
            <p className="text-xs text-on-surface-variant">
              Arrastra una imagen para reordenar (orden local).
            </p>
          </div>
          <label className="cursor-pointer">
            <Button
              asChild
              variant="dark"
              size="sm"
              className="rounded-2xl"
              disabled={busy}
            >
              <span>
                <span className="material-symbols-outlined mr-1">add</span>
                Subir fotos
              </span>
            </Button>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleAdd}
              disabled={busy}
            />
          </label>
        </div>

        {imagenes.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-surface-variant/50 p-12 text-center">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">
              photo_library
            </span>
            <p className="text-sm text-on-surface-variant mt-2">
              Esta propiedad aún no tiene imágenes. Sube algunas para empezar.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {imagenes.map((img, idx) => (
              <div
                key={img.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(idx)}
                className={`relative aspect-square rounded-2xl overflow-hidden bg-surface group cursor-move transition-all ${
                  dragIndex === idx ? 'opacity-50 scale-95' : ''
                }`}
              >
                <img
                  src={img.url}
                  alt="Imagen"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-on-surface/70 text-surface text-[10px] font-bold">
                  #{idx + 1}
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(img)}
                  disabled={busy}
                  className="absolute top-2 right-2 p-1.5 bg-error/90 text-on-error rounded-full shadow-lg opacity-90 hover:opacity-100 hover:scale-110 transition-all disabled:opacity-40"
                  aria-label="Eliminar imagen"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
