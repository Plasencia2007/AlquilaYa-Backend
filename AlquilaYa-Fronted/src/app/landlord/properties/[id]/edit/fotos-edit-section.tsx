'use client';

import { type Dispatch, type SetStateAction, useCallback } from 'react';

import { ImageUploader, type StagedImage } from '@/components/ui/image-uploader';
import { leerDimensionesImagen, MIN_LADO_PX } from '@/lib/img';
import { MAX_PROPERTY_IMAGES } from '@/lib/property-photos';
import { cn } from '@/lib/cn';
import { Section } from '../../add/property-form-primitives';

export interface ImagenExistente {
  id: number;
  url: string;
}

interface FotosEditSectionProps {
  imagenesExistentes: ImagenExistente[];
  imagenesParaEliminar: number[];
  toggleEliminarImagen: (id: number) => void;
  moverImagenExistente: (idx: number, dir: -1 | 1) => void;
  hacerPortadaExistente: (idx: number) => void;
  images: StagedImage[];
  onImagesChange: (images: StagedImage[]) => void;
  imageUrls: string[];
  removeImagenUrl: (index: number) => void;
  urlInput: string;
  setUrlInput: Dispatch<SetStateAction<string>>;
  agregarImagenUrl: () => void;
  error?: string;
}

/**
 * Gestión de fotos para la página de edición (ítem 311): a diferencia de `FotosSidebar`
 * (usada al publicar, donde todas las fotos son "nuevas"), aquí conviven fotos YA subidas
 * (con id real, se pueden borrar/reordenar/hacer portada) con fotos nuevas por agregar
 * (archivo o URL externa) — mismo comportamiento que tenía el tab "Fotos" de
 * `EditPropertyModal`, ahora como sección de la página completa.
 */
export function FotosEditSection({
  imagenesExistentes,
  imagenesParaEliminar,
  toggleEliminarImagen,
  moverImagenExistente,
  hacerPortadaExistente,
  images,
  onImagesChange,
  imageUrls,
  removeImagenUrl,
  urlInput,
  setUrlInput,
  agregarImagenUrl,
  error,
}: FotosEditSectionProps) {
  const validateImage = useCallback(async (file: File) => {
    try {
      const { width, height } = await leerDimensionesImagen(file);
      if (width < MIN_LADO_PX || height < MIN_LADO_PX) {
        return `Muy pequeña (${width}×${height}). Mínimo ${MIN_LADO_PX}px por lado.`;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const totalFotos =
    imagenesExistentes.filter((i) => !imagenesParaEliminar.includes(i.id)).length +
    images.length +
    imageUrls.length;
  const remainingSlots = MAX_PROPERTY_IMAGES - totalFotos;

  const coverId = imagenesExistentes.find((i) => !imagenesParaEliminar.includes(i.id))?.id;

  return (
    <Section step={7} icon="photo_library" title="Fotos" subtitle={`${totalFotos}/${MAX_PROPERTY_IMAGES} fotos`}>
      {imagenesExistentes.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-muted-foreground mb-2 uppercase tracking-widest">
            Fotos actuales
          </p>
          <div className="grid grid-cols-3 gap-3">
            {imagenesExistentes.map((img, idx) => {
              const marcada = imagenesParaEliminar.includes(img.id);
              const esPortada = img.id === coverId;
              return (
                <div key={img.id} className="relative group/img aspect-square rounded-2xl overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt="foto de la propiedad"
                    className={cn(
                      'w-full h-full object-cover transition-all duration-300',
                      marcada ? 'opacity-30 scale-95' : 'group-hover/img:scale-105',
                    )}
                  />
                  {esPortada && !marcada && (
                    <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-[9px] font-black px-2 py-0.5 rounded-full leading-none select-none">
                      Portada
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleEliminarImagen(img.id)}
                    aria-label={marcada ? 'Deshacer eliminación de esta foto' : 'Marcar esta foto para eliminar'}
                    className={cn(
                      'absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center shadow-lg transition-all',
                      marcada
                        ? 'bg-destructive text-destructive-foreground scale-110'
                        : 'bg-card/90 text-card-foreground opacity-0 group-hover/img:opacity-100',
                    )}
                  >
                    <span className="material-symbols-outlined text-[15px]">{marcada ? 'undo' : 'delete'}</span>
                  </button>
                  {marcada && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="bg-destructive/90 text-destructive-foreground text-[10px] font-black px-2 py-0.5 rounded-full">
                        SE ELIMINARÁ
                      </span>
                    </div>
                  )}
                  {!marcada && (
                    <div className="absolute inset-x-1 bottom-1 flex items-center justify-center gap-1 rounded-lg bg-background/85 px-1 py-0.5 opacity-100 md:opacity-0 md:group-hover/img:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => moverImagenExistente(idx, -1)}
                        disabled={idx === 0}
                        title="Subir"
                        aria-label={`Subir foto ${idx + 1} en el orden`}
                        className="p-1 rounded hover:bg-muted disabled:opacity-30"
                      >
                        <span className="material-symbols-outlined text-[15px]">arrow_upward</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => moverImagenExistente(idx, 1)}
                        disabled={idx === imagenesExistentes.length - 1}
                        title="Bajar"
                        aria-label={`Bajar foto ${idx + 1} en el orden`}
                        className="p-1 rounded hover:bg-muted disabled:opacity-30"
                      >
                        <span className="material-symbols-outlined text-[15px]">arrow_downward</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => hacerPortadaExistente(idx)}
                        disabled={esPortada}
                        title="Hacer portada"
                        aria-label={`Hacer portada la foto ${idx + 1}`}
                        className="p-1 rounded hover:bg-muted disabled:opacity-30"
                      >
                        <span className="material-symbols-outlined text-[15px]">star</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div data-field="imagen">
        <p className="text-[11px] font-bold text-muted-foreground mb-2 uppercase tracking-widest">
          Agregar fotos nuevas
        </p>
        <ImageUploader
          images={images}
          onImagesChange={onImagesChange}
          remainingSlots={remainingSlots}
          validateImage={validateImage}
        />

        {imageUrls.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            {imageUrls.map((url, i) => (
              <div key={i} className="relative aspect-[4/3] rounded-lg overflow-hidden group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Enlace ${i + 1}`} className="w-full h-full object-cover" />
                <div className="absolute top-1 left-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none select-none">
                  URL
                </div>
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => removeImagenUrl(i)}
                    title="Quitar"
                    aria-label={`Quitar imagen enlazada ${i + 1}`}
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-destructive text-white hover:bg-destructive/80 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[13px]">close</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 mt-3">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                agregarImagenUrl();
              }
            }}
            placeholder="o pega el enlace de una imagen (.jpg/.png)"
            disabled={remainingSlots <= 0}
            className="flex-1 rounded-lg border border-border bg-input px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          />
          <button
            type="button"
            onClick={agregarImagenUrl}
            disabled={!urlInput.trim() || remainingSlots <= 0}
            className="shrink-0 rounded-lg border border-border px-3 text-xs font-bold text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
          >
            Agregar
          </button>
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground/70 leading-snug">
          Reusa una imagen ya alojada en otro host. Debe ser un enlace{' '}
          <span className="font-semibold">directo</span> a la imagen — los de Google/Drive no funcionan.
        </p>

        {error && (
          <p className="mt-2 text-[11px] font-semibold text-destructive flex items-center gap-1 animate-in fade-in slide-in-from-bottom-2 duration-400">
            <span className="material-symbols-outlined text-[13px]">error</span>
            {error}
          </p>
        )}
      </div>
    </Section>
  );
}
