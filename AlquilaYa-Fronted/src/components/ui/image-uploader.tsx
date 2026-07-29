'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { cn } from '@/lib/cn';
import { Progress } from '@/components/ui/progress';

export interface StagedImage {
  id: string;
  file: File;
  preview: string;
  progress: number;
  status: 'reading' | 'ready' | 'error';
  error?: string;
}

export interface ImageUploaderProps {
  /** Valor inicial (solo se lee en el primer render — ver nota de estado más abajo). */
  images: StagedImage[];
  /**
   * El estado real vive DENTRO de este componente (necesario para actualizar el progreso de
   * varios archivos en paralelo sin pisarse). Cada cambio se reporta hacia arriba por acá,
   * para que el padre pueda leerlo al enviar el formulario.
   */
  onImagesChange: (images: StagedImage[]) => void;
  /** Cuántas imágenes más se pueden agregar (ya descuenta otras fuentes, ej. URLs externas). */
  remainingSlots: number;
  maxBytes?: number;
  acceptedTypes?: string[];
  /**
   * Validación adicional específica del dominio (ej. resolución mínima). Se corre después de
   * la lectura del archivo; si devuelve un mensaje, la imagen queda marcada como error.
   */
  validateImage?: (file: File) => Promise<string | null>;
  disabled?: boolean;
  className?: string;
}

const DEFAULT_ACCEPTED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;

function readAsDataURLWithProgress(
  file: File,
  onProgress: (pct: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    reader.onload = () => {
      onProgress(100);
      resolve(reader.result as string);
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
}

function extensionesDe(types: string[]): string {
  return types
    .map((t) => t.split('/')[1])
    .filter(Boolean)
    .map((ext) => `.${ext}`)
    .join(', ');
}

interface SortableTileProps {
  image: StagedImage;
  index: number;
  isCover: boolean;
  onRemove: () => void;
  onSetCover: () => void;
}

function SortableTile({ image, index, isCover, onRemove, onSetCover }: SortableTileProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'group relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-muted',
        isCover && 'ring-2 ring-primary ring-offset-1 ring-offset-card',
        isDragging && 'z-10 opacity-70 shadow-lg',
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.preview}
        alt={`Foto ${index + 1}`}
        className="h-full w-full object-cover pointer-events-none select-none"
        draggable={false}
      />

      <button
        type="button"
        {...attributes}
        {...listeners}
        title="Arrastra para reordenar"
        aria-label={`Reordenar foto ${index + 1}`}
        className="absolute left-1 top-1 flex h-6 w-6 cursor-grab items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity active:cursor-grabbing group-hover:opacity-100 touch-none"
      >
        <span className="material-symbols-outlined text-[13px]">drag_indicator</span>
      </button>

      {isCover && (
        <div className="absolute top-1 left-1 group-hover:opacity-0 transition-opacity bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none select-none pointer-events-none">
          Portada
        </div>
      )}

      {image.status === 'reading' && (
        <div className="absolute inset-x-1 bottom-1">
          <Progress value={image.progress} label={`Procesando ${image.file.name}`} className="h-1.5" />
        </div>
      )}

      {image.status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-destructive/80 p-2 text-center">
          <span className="material-symbols-outlined text-[18px] text-white">error</span>
          <p className="text-[9px] font-semibold leading-tight text-white">{image.error}</p>
        </div>
      )}

      {image.status === 'ready' && (
        <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
          {!isCover && (
            <button
              type="button"
              onClick={onSetCover}
              title="Usar como portada"
              aria-label={`Usar la foto ${index + 1} como portada`}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/80"
            >
              <span className="material-symbols-outlined text-[13px]">star</span>
            </button>
          )}
          <button
            type="button"
            onClick={onRemove}
            title="Eliminar foto"
            aria-label={`Eliminar foto ${index + 1}`}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-destructive text-white transition-colors hover:bg-destructive/80"
          >
            <span className="material-symbols-outlined text-[13px]">close</span>
          </button>
        </div>
      )}

      {image.status === 'error' && (
        <button
          type="button"
          onClick={onRemove}
          title="Quitar"
          aria-label={`Quitar foto ${index + 1} con error`}
          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
        >
          <span className="material-symbols-outlined text-[13px]">close</span>
        </button>
      )}
    </div>
  );
}

export function ImageUploader({
  images: initialImages,
  onImagesChange,
  remainingSlots,
  maxBytes = DEFAULT_MAX_BYTES,
  acceptedTypes = DEFAULT_ACCEPTED,
  validateImage,
  disabled,
  className,
}: ImageUploaderProps) {
  const uid = useId();
  const [dropError, setDropError] = useState<string | null>(null);
  // Fuente de verdad local — ver comentario en ImageUploaderProps.onImagesChange.
  const [images, setImages] = useState<StagedImage[]>(initialImages);

  useEffect(() => {
    onImagesChange(images);
    // Solo queremos avisar hacia arriba cuando el array local cambia, no cuando cambia la
    // referencia de onImagesChange (evita loops si el padre no la memoiza).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const processFile = useCallback(
    async (file: File, id: string) => {
      const patch = (p: Partial<StagedImage>) =>
        setImages((prev) => prev.map((img) => (img.id === id ? { ...img, ...p } : img)));
      try {
        const preview = await readAsDataURLWithProgress(file, (pct) => patch({ progress: pct }));
        patch({ preview, progress: 100 });
        if (validateImage) {
          const problema = await validateImage(file);
          if (problema) {
            patch({ status: 'error', error: problema });
            return;
          }
        }
        patch({ status: 'ready' });
      } catch {
        patch({ status: 'error', error: 'No se pudo procesar la imagen.' });
      }
    },
    [validateImage],
  );

  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      setDropError(null);

      if (rejections.length > 0) {
        const primero = rejections[0];
        const motivo = primero.errors[0]?.code;
        if (motivo === 'file-too-large') {
          setDropError(`"${primero.file.name}" excede el tamaño máximo (${Math.round(maxBytes / 1024 / 1024)} MB).`);
        } else if (motivo === 'file-invalid-type') {
          setDropError(`"${primero.file.name}": formato no soportado. Usa ${extensionesDe(acceptedTypes)}.`);
        } else {
          setDropError(`"${primero.file.name}" no se pudo agregar.`);
        }
      }

      if (accepted.length === 0) return;

      const candidatos = accepted.slice(0, Math.max(0, remainingSlots));
      if (candidatos.length < accepted.length) {
        setDropError(`Solo se agregaron ${candidatos.length}: llegaste al máximo de fotos.`);
      }
      if (candidatos.length === 0) return;

      const nuevas: StagedImage[] = candidatos.map((file, i) => ({
        id: `${uid}-${Date.now()}-${i}-${file.name}`,
        file,
        preview: '',
        progress: 0,
        status: 'reading',
      }));

      setImages((prev) => [...prev, ...nuevas]);
      nuevas.forEach((img) => void processFile(img.file, img.id));
    },
    [acceptedTypes, maxBytes, processFile, remainingSlots, uid],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: Object.fromEntries(acceptedTypes.map((t) => [t, []])),
    maxSize: maxBytes,
    disabled: disabled || remainingSlots <= 0,
    multiple: true,
    noClick: false,
  });

  const handleRemove = useCallback(
    (id: string) => setImages((prev) => prev.filter((img) => img.id !== id)),
    [],
  );

  const handleSetCover = useCallback(
    (id: string) =>
      setImages((prev) => {
        const idx = prev.findIndex((img) => img.id === id);
        return idx <= 0 ? prev : arrayMove(prev, idx, 0);
      }),
    [],
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setImages((prev) => {
      const oldIndex = prev.findIndex((img) => img.id === active.id);
      const newIndex = prev.findIndex((img) => img.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }, []);

  const itemIds = useMemo(() => images.map((img) => img.id), [images]);
  // La "portada" real es la primera imagen YA lista (ready) en orden — evita marcar como
  // portada una que todavía está procesándose o que falló la validación.
  const firstReadyId = useMemo(
    () => images.find((img) => img.status === 'ready')?.id,
    [images],
  );

  return (
    <div className={cn('space-y-3', className)}>
      {images.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={itemIds} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-3 gap-2">
              {images.map((img, i) => (
                <SortableTile
                  key={img.id}
                  image={img}
                  index={i}
                  isCover={img.id === firstReadyId}
                  onRemove={() => handleRemove(img.id)}
                  onSetCover={() => handleSetCover(img.id)}
                />
              ))}

              {remainingSlots > 0 && (
                <div
                  {...getRootProps()}
                  className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border bg-background text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                >
                  <input {...getInputProps()} />
                  <span className="material-symbols-outlined text-[22px]">add_photo_alternate</span>
                  <span className="text-[10px] font-semibold">Agregar</span>
                </div>
              )}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {images.length === 0 && (
        <div
          {...getRootProps()}
          className={cn(
            'flex select-none flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-all',
            remainingSlots > 0 ? 'cursor-pointer' : 'cursor-not-allowed opacity-60',
            isDragActive
              ? 'border-primary bg-accent/50'
              : dropError
                ? 'border-destructive/50 bg-destructive/5'
                : 'border-border hover:border-primary/50 hover:bg-muted/50',
          )}
        >
          <input {...getInputProps()} />
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent">
            <span className="material-symbols-outlined text-[26px] text-accent-foreground">
              add_photo_alternate
            </span>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">
              {isDragActive ? 'Suelta aquí' : 'Arrastra fotos aquí'}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">o haz clic para explorar</p>
          </div>
          <p className="text-center text-[10px] text-muted-foreground/70">
            {extensionesDe(acceptedTypes).toUpperCase()} · Máx. {Math.round(maxBytes / 1024 / 1024)} MB por foto
          </p>
        </div>
      )}

      {dropError && (
        <p className="flex items-center gap-1 text-[11px] font-semibold text-destructive animate-in fade-in slide-in-from-bottom-2 duration-400">
          <span className="material-symbols-outlined text-[13px]">error</span>
          {dropError}
        </p>
      )}

      {images.length > 0 && (
        <p className="text-center text-[10px] text-muted-foreground">
          Arrastra una foto para reordenar · toca <span className="font-bold">★</span> para elegirla como portada
        </p>
      )}
    </div>
  );
}
