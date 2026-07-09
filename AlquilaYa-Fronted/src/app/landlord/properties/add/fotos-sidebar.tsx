'use client';

import {
  type ChangeEvent,
  type Dispatch,
  type DragEvent,
  type RefObject,
  type SetStateAction,
} from 'react';

import { cn } from '@/lib/cn';
import { MAX_IMAGES, type Errores } from './property-form-types';

interface FotosSidebarProps {
  imageFiles: File[];
  imageUrls: string[];
  previews: string[];
  coverIndex: number;
  setCoverIndex: Dispatch<SetStateAction<number>>;
  removeImage: (index: number) => void;
  isDragging: boolean;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  errores: Errores;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileInput: (e: ChangeEvent<HTMLInputElement>) => void;
  removeImagenUrl: (index: number) => void;
  urlInput: string;
  setUrlInput: Dispatch<SetStateAction<string>>;
  agregarImagenUrl: () => void;
}

export function FotosSidebar({
  imageFiles,
  imageUrls,
  previews,
  coverIndex,
  setCoverIndex,
  removeImage,
  isDragging,
  onDrop,
  onDragOver,
  onDragLeave,
  errores,
  fileInputRef,
  onFileInput,
  removeImagenUrl,
  urlInput,
  setUrlInput,
  agregarImagenUrl,
}: FotosSidebarProps) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground">Fotos del cuarto</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Sube hasta {MAX_IMAGES} fotos · elige la portada
          </p>
        </div>
        <span className="text-xs font-semibold text-muted-foreground tabular-nums">
          {imageFiles.length + imageUrls.length}/{MAX_IMAGES}
        </span>
      </div>

      <div data-field="imagen" className="p-5 space-y-3">

        {/* Grid de previews */}
        {previews.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {previews.map((src, i) => (
              <div
                key={i}
                className={cn(
                  'relative aspect-[4/3] rounded-lg overflow-hidden group',
                  i === coverIndex && 'ring-2 ring-primary ring-offset-1 ring-offset-card',
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                {i === coverIndex && (
                  <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none select-none">
                    Portada
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                  {i !== coverIndex && (
                    <button
                      type="button"
                      onClick={() => setCoverIndex(i)}
                      title="Usar como portada"
                      className="w-7 h-7 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[13px]">star</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    title="Eliminar foto"
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-destructive text-white hover:bg-destructive/80 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[13px]">close</span>
                  </button>
                </div>
              </div>
            ))}

            {imageFiles.length + imageUrls.length < MAX_IMAGES && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-[4/3] rounded-lg border-2 border-dashed border-border hover:border-primary/50 bg-background flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-[22px]">add_photo_alternate</span>
                <span className="text-[10px] font-semibold">Agregar</span>
              </button>
            )}
          </div>
        )}

        {/* Dropzone vacío */}
        {previews.length === 0 && (
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all select-none',
              isDragging
                ? 'border-primary bg-accent/50'
                : errores.imagen
                  ? 'border-destructive/50 bg-destructive/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50',
            )}
          >
            <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
              <span className="material-symbols-outlined text-[26px] text-accent-foreground">
                add_photo_alternate
              </span>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">
                {isDragging ? 'Suelta aquí' : 'Arrastra fotos aquí'}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                o haz clic para explorar
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground/70 text-center">
              JPG, PNG o WEBP · Máx. 10 MB por foto
            </p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          multiple
          onChange={onFileInput}
          className="hidden"
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
          <p className="text-[11px] font-semibold text-destructive flex items-center gap-1 animate-fade-in">
            <span className="material-symbols-outlined text-[13px]">error</span>
            {errores.imagen}
          </p>
        )}

        {previews.length > 0 && (
          <p className="text-[10px] text-muted-foreground text-center">
            Toca <span className="font-bold">★</span> sobre una imagen para elegirla como portada
          </p>
        )}
      </div>
    </div>
  );
}
