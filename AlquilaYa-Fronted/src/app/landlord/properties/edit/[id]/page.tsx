'use client';

// NOTA: Por seguridad NO se refactoriza `add/page.tsx`. Los inputs se duplican
// aquí intencionalmente; consolidar en un PropertyForm compartido queda como TODO.

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/legacy-badge';
import { Button } from '@/components/ui/legacy-button';
import { Input } from '@/components/ui/legacy-input';
import { Card } from '@/components/ui/legacy-card';
import { propiedadService } from '@/services/landlord-property-service';
import { notify } from '@/lib/notify';
import type {
  PropiedadCompleta,
  PropiedadImagen,
  PropiedadUpdate,
} from '@/types/propiedad';

type ImagenExistente = { id: number; url: string };

export default function EditPropertyPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    precio: '',
    direccion: '',
    tipoPropiedad: '',
    periodoAlquiler: '',
    area: '',
    nroPiso: '',
    estaDisponible: true,
  });

  // Imágenes existentes en backend. Como el endpoint /completo solo devuelve URLs,
  // recuperamos las imágenes con id desde GET /arrendador/{aId} y filtramos por propiedad.
  const [imagenesExistentes, setImagenesExistentes] = useState<ImagenExistente[]>([]);
  const [nuevasImagenes, setNuevasImagenes] = useState<File[]>([]);
  const [previewsNuevas, setPreviewsNuevas] = useState<string[]>([]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const cargar = async () => {
      try {
        setLoading(true);
        const data: PropiedadCompleta = await propiedadService.obtenerCompleto(id);
        if (cancelled) return;
        setFormData({
          titulo: data.titulo ?? '',
          descripcion: data.descripcion ?? '',
          precio: data.precio != null ? String(data.precio) : '',
          direccion: data.direccion ?? '',
          tipoPropiedad: data.tipoPropiedad ?? '',
          periodoAlquiler: data.periodoAlquiler ?? '',
          area: data.area != null ? String(data.area) : '',
          nroPiso: data.nroPiso != null ? String(data.nroPiso) : '',
          estaDisponible: data.estaDisponible ?? true,
        });

        // Recuperar imágenes con id pidiendo el listado por arrendador
        try {
          const todas = await propiedadService.obtenerPorArrendador(String(data.arrendadorId));
          const propia = todas.find((p) => String(p.id) === String(id));
          const imgs: ImagenExistente[] = (propia?.imagenes ?? [])
            .slice()
            .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
            .map((i: PropiedadImagen) => ({ id: i.id, url: i.url }));
          if (!cancelled) setImagenesExistentes(imgs);
        } catch {
          // Si falla, usamos URLs sin id (no permitirá eliminar individualmente)
          if (!cancelled) {
            setImagenesExistentes(
              (data.imagenes ?? []).map((url, idx) => ({ id: -1 - idx, url })),
            );
          }
        }
      } catch (err) {
        console.error('Error cargando propiedad:', err);
        if (!cancelled) setError('No se pudo cargar la propiedad.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    cargar();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNuevasImagenes = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setNuevasImagenes((prev) => [...prev, ...files]);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewsNuevas((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
    // permitir reseleccionar el mismo archivo
    e.target.value = '';
  };

  const eliminarImagenExistente = async (img: ImagenExistente) => {
    if (!id) return;
    if (img.id < 0) {
      notify.warning('No se puede eliminar esta imagen (sin identificador).');
      return;
    }
    if (!confirm('¿Eliminar esta imagen?')) return;
    try {
      await propiedadService.eliminarImagen(id, img.id);
      setImagenesExistentes((prev) => prev.filter((x) => x.id !== img.id));
      notify.success('Imagen eliminada');
    } catch (err) {
      notify.error(err, 'No se pudo eliminar la imagen');
    }
  };

  const eliminarPreview = (idx: number) => {
    setNuevasImagenes((prev) => prev.filter((_, i) => i !== idx));
    setPreviewsNuevas((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      const payload: PropiedadUpdate = {
        titulo: formData.titulo,
        descripcion: formData.descripcion,
        precio: formData.precio ? parseFloat(formData.precio) : undefined,
        direccion: formData.direccion,
        tipoPropiedad: formData.tipoPropiedad || undefined,
        periodoAlquiler: formData.periodoAlquiler || undefined,
        area: formData.area ? parseFloat(formData.area) : undefined,
        nroPiso: formData.nroPiso ? parseInt(formData.nroPiso, 10) : undefined,
        estaDisponible: formData.estaDisponible,
      };
      await propiedadService.actualizar(id, payload);
      if (nuevasImagenes.length > 0) {
        await propiedadService.subirImagenes(id, nuevasImagenes);
      }
      notify.success('Propiedad actualizada');
      router.push('/landlord/properties/active');
    } catch (err: unknown) {
      console.error('Error actualizando propiedad:', err);
      setError('No se pudo actualizar la propiedad.');
      notify.error(err, 'No se pudo actualizar la propiedad');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] animate-pulse">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-on-surface-variant font-medium">Cargando propiedad...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/landlord/properties/active"
          className="text-on-surface-variant hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <Badge variant="surface" className="mb-1">
            Editar publicación
          </Badge>
          <h1 className="text-4xl font-black text-on-surface tracking-tighter">
            Editar mi cuarto
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-sm bg-surface-container-low">
            <div className="mb-6">
              <h3 className="text-xl font-black text-on-surface tracking-tight">
                Información General
              </h3>
              <p className="text-sm text-on-surface-variant">
                Actualiza los detalles de tu propiedad.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-on-surface-variant px-1">
                  Título del anuncio
                </label>
                <Input
                  required
                  name="titulo"
                  value={formData.titulo}
                  onChange={handleInputChange}
                  className="bg-surface border-none focus-visible:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-on-surface-variant px-1">
                  Descripción detallada
                </label>
                <textarea
                  required
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleInputChange}
                  className="w-full min-h-[120px] rounded-xl bg-surface border-none p-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-on-surface-variant px-1">
                    Precio mensual (S/)
                  </label>
                  <Input
                    required
                    type="number"
                    name="precio"
                    value={formData.precio}
                    onChange={handleInputChange}
                    className="bg-surface border-none focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-on-surface-variant px-1">
                    Dirección exacta
                  </label>
                  <Input
                    required
                    name="direccion"
                    value={formData.direccion}
                    onChange={handleInputChange}
                    className="bg-surface border-none focus-visible:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-on-surface-variant px-1">
                    Tipo
                  </label>
                  <Input
                    name="tipoPropiedad"
                    placeholder="CUARTO, DEPARTAMENTO..."
                    value={formData.tipoPropiedad}
                    onChange={handleInputChange}
                    className="bg-surface border-none focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-on-surface-variant px-1">
                    Periodo
                  </label>
                  <Input
                    name="periodoAlquiler"
                    placeholder="MENSUAL, SEMESTRAL..."
                    value={formData.periodoAlquiler}
                    onChange={handleInputChange}
                    className="bg-surface border-none focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-on-surface-variant px-1">
                    Área (m²)
                  </label>
                  <Input
                    type="number"
                    name="area"
                    value={formData.area}
                    onChange={handleInputChange}
                    className="bg-surface border-none focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-on-surface-variant px-1">
                    Piso
                  </label>
                  <Input
                    type="number"
                    name="nroPiso"
                    value={formData.nroPiso}
                    onChange={handleInputChange}
                    className="bg-surface border-none focus-visible:ring-primary"
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 px-1 pt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.estaDisponible}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, estaDisponible: e.target.checked }))
                  }
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm text-on-surface-variant">Disponible para reservas</span>
              </label>
            </div>
          </Card>

          <Card className="border-none shadow-sm bg-surface-container-low">
            <div className="mb-4">
              <h3 className="text-xl font-black text-on-surface tracking-tight">Galería</h3>
              <p className="text-sm text-on-surface-variant">
                Elimina imágenes existentes o añade nuevas.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {imagenesExistentes.map((img) => (
                <div
                  key={img.id}
                  className="relative aspect-square rounded-2xl overflow-hidden bg-surface group"
                >
                  <img
                    src={img.url}
                    alt="Imagen propiedad"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => eliminarImagenExistente(img)}
                    className="absolute top-2 right-2 p-1.5 bg-error/90 text-on-error rounded-full shadow-lg opacity-90 hover:opacity-100 hover:scale-110 transition-all"
                    aria-label="Eliminar imagen"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              ))}

              {previewsNuevas.map((src, idx) => (
                <div
                  key={`new-${idx}`}
                  className="relative aspect-square rounded-2xl overflow-hidden bg-surface ring-2 ring-primary/40"
                >
                  <img src={src} alt="Nueva" className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 left-1 text-[10px] bg-primary text-on-primary px-1.5 py-0.5 rounded-md font-bold">
                    NUEVA
                  </span>
                  <button
                    type="button"
                    onClick={() => eliminarPreview(idx)}
                    className="absolute top-2 right-2 p-1.5 bg-error/90 text-on-error rounded-full shadow-lg hover:scale-110 transition-transform"
                    aria-label="Quitar"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              ))}

              <label className="aspect-square rounded-2xl border-2 border-dashed border-surface-variant hover:border-primary/50 bg-surface/50 flex flex-col items-center justify-center cursor-pointer transition-all">
                <span className="material-symbols-outlined text-3xl text-on-surface-variant">
                  add_a_photo
                </span>
                <span className="text-[11px] text-on-surface-variant mt-1 font-medium">
                  Añadir fotos
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleNuevasImagenes}
                />
              </label>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-sm bg-surface-container-low">
            <h3 className="text-lg font-black text-on-surface tracking-tight mb-2">Acciones</h3>
            <p className="text-xs text-on-surface-variant mb-4">
              Los cambios se guardarán en el servidor inmediatamente.
            </p>

            {error && (
              <div className="p-3 bg-error/10 text-error text-xs rounded-xl border border-error/20 mb-3">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <Button
                type="submit"
                disabled={saving}
                variant="dark"
                className="w-full h-12 text-base font-bold rounded-2xl"
              >
                {saving ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                    Guardando...
                  </div>
                ) : (
                  'Guardar cambios'
                )}
              </Button>
              <Button
                asChild
                variant="ghost"
                className="w-full rounded-2xl border border-surface-variant"
              >
                <Link href="/landlord/properties/active">Cancelar</Link>
              </Button>
            </div>
          </Card>
        </div>
      </form>
    </div>
  );
}
