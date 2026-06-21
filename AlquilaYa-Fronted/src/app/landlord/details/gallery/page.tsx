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
import { leerDimensionesImagen, MIN_LADO_PX } from '@/lib/img';

type ImagenItem = { id: number; url: string; orden: number };

export default function GalleryPage() {
  const { usuario } = useAuthStore();
  const [propiedades, setPropiedades] = useState<PropiedadBackend[]>([]);
  const [propiedadId, setPropiedadId] = useState<string>('');
  const [imagenes, setImagenes] = useState<ImagenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [urlInput, setUrlInput] = useState('');

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
    // Pre-chequeo de resolución (feedback inmediato; el backend valida igual al recibir).
    const validos: File[] = [];
    for (const f of files) {
      try {
        const { width, height } = await leerDimensionesImagen(f);
        if (width < MIN_LADO_PX || height < MIN_LADO_PX) {
          notify.error(
            null,
            `${f.name}: muy pequeña (${width}×${height}). Mínimo ${MIN_LADO_PX}px por lado.`,
          );
          continue;
        }
        validos.push(f);
      } catch {
        validos.push(f); // si no se pudo medir, que decida el backend
      }
    }
    if (!validos.length) {
      e.target.value = '';
      return;
    }
    try {
      setBusy(true);
      await propiedadService.subirImagenes(propiedadId, validos);
      notify.success(`${validos.length} imagen(es) subida(s)`);
      await refrescar();
    } catch (err) {
      notify.error(err, 'No se pudieron subir las imágenes');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  /** Valida rápido en cliente: https + extensión de imagen directa (feedback inmediato). */
  const esUrlImagenValida = (url: string): boolean => {
    try {
      const u = new URL(url);
      return (
        u.protocol === 'https:' &&
        /\.(jpe?g|png|webp|gif|avif)$/i.test(u.pathname)
      );
    } catch {
      return false;
    }
  };

  const handleAgregarUrl = async () => {
    if (!propiedadId) return;
    const url = urlInput.trim();
    if (!url) return;
    if (!esUrlImagenValida(url)) {
      notify.error(
        null,
        'Pega un enlace DIRECTO a una imagen (.jpg/.png/.webp). Los enlaces de Google/Drive no sirven.',
      );
      return;
    }
    try {
      setBusy(true);
      await propiedadService.agregarImagenPorUrl(propiedadId, url);
      notify.success('Imagen agregada por URL');
      setUrlInput('');
      await refrescar();
    } catch (err) {
      notify.error(err, 'No se pudo agregar la imagen por URL');
    } finally {
      setBusy(false);
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

  const handleDragStart = (idx: number) => setDragIndex(idx);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  /**
   * Persiste un nuevo orden de inmediato (sin botón "guardar"): actualiza la UI de
   * forma optimista y, si la API falla, revierte. La primera imagen es la portada.
   */
  const persistirOrden = async (reordenadas: ImagenItem[], successMsg?: string) => {
    if (!propiedadId) return;
    const previo = imagenes;
    const conOrden = reordenadas.map((it, i) => ({ ...it, orden: i }));
    setImagenes(conOrden);
    try {
      setBusy(true);
      await propiedadService.reordenarImagenes(
        propiedadId,
        conOrden.map((img) => img.id),
      );
      if (successMsg) notify.success(successMsg);
      await refrescar();
    } catch (err) {
      setImagenes(previo); // rollback
      notify.error(err, 'No se pudo guardar el orden');
    } finally {
      setBusy(false);
    }
  };

  const handleDrop = (idx: number) => {
    if (dragIndex === null || dragIndex === idx) {
      setDragIndex(null);
      return;
    }
    const next = imagenes.slice();
    const [moved] = next.splice(dragIndex, 1);
    next.splice(idx, 0, moved);
    setDragIndex(null);
    void persistirOrden(next, 'Orden guardado');
  };

  /** Mueve una imagen una posición arriba (-1) o abajo (+1). Funciona en táctil y teclado. */
  const moverImagen = (idx: number, dir: -1 | 1) => {
    const destino = idx + dir;
    if (destino < 0 || destino >= imagenes.length) return;
    const next = imagenes.slice();
    [next[idx], next[destino]] = [next[destino], next[idx]];
    void persistirOrden(next, 'Orden guardado');
  };

  /** Mueve una imagen al frente (posición 0 = portada). */
  const handleHacerPortada = (idx: number) => {
    if (idx === 0) return;
    const next = imagenes.slice();
    const [moved] = next.splice(idx, 1);
    next.unshift(moved);
    void persistirOrden(next, 'Portada actualizada');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] animate-pulse">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground font-medium">Cargando galería...</p>
      </div>
    );
  }

  if (!propiedades.length) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center animate-fade-in">
        <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center text-primary mx-auto mb-4">
          <span className="material-symbols-outlined text-4xl">photo_library</span>
        </div>
        <h1 className="text-2xl font-black text-foreground mb-2">No tienes propiedades aún</h1>
        <p className="text-muted-foreground mb-6">
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
        <h1 className="text-4xl font-black text-foreground tracking-tighter">
          Gestión de <span className="text-primary">imágenes</span>
        </h1>
        <p className="text-muted-foreground mt-2 max-w-lg">
          Sube, elimina y reordena las fotos de tus propiedades.
        </p>
      </div>

      <Card className="border-none shadow-sm bg-muted mb-6">
        <label className="text-sm font-medium text-muted-foreground block mb-2">
          Propiedad
        </label>
        <select
          value={propiedadId}
          onChange={(e) => handleSelect(e.target.value)}
          className="w-full rounded-2xl bg-background border border-border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {propiedades.map((p) => (
            <option key={p.id} value={String(p.id)}>
              {p.titulo}
            </option>
          ))}
        </select>
      </Card>

      <Card className="border-none shadow-sm bg-muted">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-black text-foreground">
              {imagenes.length} {imagenes.length === 1 ? 'imagen' : 'imágenes'}
            </h2>
            <p className="text-xs text-muted-foreground">
              Arrastra o usa los controles ↑ ↓ para reordenar. La primera imagen es la{' '}
              <span className="font-semibold text-primary">portada</span>. Se guarda
              automáticamente.
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

        {/* Agregar por URL externa (no consume Cloudinary) */}
        <div className="mb-5 rounded-2xl bg-background/60 border border-border p-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAgregarUrl();
                }
              }}
              placeholder="https://…/foto.jpg  (enlace directo a la imagen)"
              disabled={busy}
              className="flex-1 rounded-xl bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl shrink-0"
              onClick={handleAgregarUrl}
              disabled={busy || !urlInput.trim()}
            >
              <span className="material-symbols-outlined mr-1 text-[18px]">link</span>
              Agregar por URL
            </Button>
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Reusa una imagen ya alojada en otro host (no usa tu Cloudinary). Debe ser un
            enlace <span className="font-semibold">directo</span> a la imagen (.jpg/.png/.webp) —
            los enlaces de Google Imágenes/Drive/Fotos no funcionan.
          </p>
        </div>

        {imagenes.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border-variant/50 p-12 text-center">
            <span className="material-symbols-outlined text-4xl text-muted-foreground/40">
              photo_library
            </span>
            <p className="text-sm text-muted-foreground mt-2">
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
                className={`relative aspect-square rounded-2xl overflow-hidden bg-background group cursor-move transition-all ${
                  dragIndex === idx ? 'opacity-50 scale-95' : ''
                }`}
              >
                <img
                  src={img.url}
                  alt="Imagen"
                  className="w-full h-full object-cover"
                />
                {idx === 0 ? (
                  <div className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary text-primary-foreground text-[10px] font-bold shadow">
                    <span className="material-symbols-outlined text-[12px] leading-none">
                      star
                    </span>
                    Portada
                  </div>
                ) : (
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-foreground/70 text-background text-[10px] font-bold">
                    #{idx + 1}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(img)}
                  disabled={busy}
                  className="absolute top-2 right-2 p-1.5 bg-destructive/90 text-on-error rounded-full shadow-lg opacity-90 hover:opacity-100 hover:scale-110 transition-all disabled:opacity-40"
                  aria-label="Eliminar imagen"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
                {/* Controles de orden: siempre visibles en móvil (sin hover), hover en desktop */}
                <div className="absolute inset-x-1 bottom-1 flex items-center justify-center gap-1 rounded-lg bg-background/85 px-1 py-0.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => moverImagen(idx, -1)}
                    disabled={busy || idx === 0}
                    className="p-1 rounded hover:bg-muted disabled:opacity-30"
                    title="Subir"
                    aria-label="Subir imagen"
                  >
                    <span className="material-symbols-outlined text-[16px] leading-none">
                      arrow_upward
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => moverImagen(idx, 1)}
                    disabled={busy || idx === imagenes.length - 1}
                    className="p-1 rounded hover:bg-muted disabled:opacity-30"
                    title="Bajar"
                    aria-label="Bajar imagen"
                  >
                    <span className="material-symbols-outlined text-[16px] leading-none">
                      arrow_downward
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleHacerPortada(idx)}
                    disabled={busy || idx === 0}
                    className="p-1 rounded hover:bg-muted disabled:opacity-30"
                    title="Hacer portada"
                    aria-label="Hacer portada"
                  >
                    <span className="material-symbols-outlined text-[16px] leading-none">
                      star
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
