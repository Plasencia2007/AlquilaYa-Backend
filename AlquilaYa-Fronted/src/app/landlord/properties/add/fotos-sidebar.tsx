'use client';

import { type Dispatch, type SetStateAction, useCallback } from 'react';

import { ImageUploader, type StagedImage } from '@/components/ui/image-uploader';
import { leerDimensionesImagen, MIN_LADO_PX } from '@/lib/img';
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGES, MAX_IMAGE_BYTES, type Errores } from './property-form-types';

interface FotosSidebarProps {
  images: StagedImage[];
  onImagesChange: (images: StagedImage[]) => void;
  imageUrls: string[];
  errores: Errores;
  removeImagenUrl: (index: number) => void;
  urlInput: string;
  setUrlInput: Dispatch<SetStateAction<string>>;
  agregarImagenUrl: () => void;
}

export function FotosSidebar({
  images,
  onImagesChange,
  imageUrls,
  errores,
  removeImagenUrl,
  urlInput,
  setUrlInput,
  agregarImagenUrl,
}: FotosSidebarProps) {
  // Feedback inmediato de resolución mínima; el backend valida igual al subir.
  const validateImage = useCallback(async (file: File) => {
    try {
      const { width, height } = await leerDimensionesImagen(file);
      if (width < MIN_LADO_PX || height < MIN_LADO_PX) {
        return `Muy pequeña (${width}×${height}). Mínimo ${MIN_LADO_PX}px por lado.`;
      }
      return null;
    } catch {
      return null; // si no se puede medir, deja pasar: el backend decide
    }
  }, []);

  const remainingSlots = MAX_IMAGES - images.length - imageUrls.length;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground">Fotos del cuarto</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Sube hasta {MAX_IMAGES} fotos · arrastra para ordenar
          </p>
        </div>
        <span className="text-xs font-semibold text-muted-foreground tabular-nums">
          {images.length + imageUrls.length}/{MAX_IMAGES}
        </span>
      </div>

      <div data-field="imagen" className="p-5 space-y-3">
        <ImageUploader
          images={images}
          onImagesChange={onImagesChange}
          remainingSlots={remainingSlots}
          maxBytes={MAX_IMAGE_BYTES}
          acceptedTypes={ACCEPTED_IMAGE_TYPES}
          validateImage={validateImage}
        />

        {/* Miniaturas de imágenes agregadas por URL */}
        {imageUrls.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
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

        {/* Agregar imagen por URL externa */}
        <div className="flex gap-2">
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
            className="flex-1 rounded-lg border border-border bg-input px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="button"
            onClick={agregarImagenUrl}
            disabled={!urlInput.trim()}
            className="shrink-0 rounded-lg border border-border px-3 text-xs font-bold text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
          >
            Agregar
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground/70 leading-snug">
          Reusa una imagen ya alojada en otro host (no usa tu almacenamiento). Debe ser un
          enlace <span className="font-semibold">directo</span> a la imagen — los de Google/Drive no funcionan.
        </p>

        {errores.imagen && (
          <p className="text-[11px] font-semibold text-destructive flex items-center gap-1 animate-in fade-in slide-in-from-bottom-2 duration-400">
            <span className="material-symbols-outlined text-[13px]">error</span>
            {errores.imagen}
          </p>
        )}
      </div>
    </div>
  );
}
