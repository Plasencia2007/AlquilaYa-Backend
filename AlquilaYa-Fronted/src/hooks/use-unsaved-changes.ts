'use client';

import { useEffect } from 'react';

const MENSAJE_POR_DEFECTO = 'Tienes cambios sin guardar. ¿Seguro que deseas salir?';

/**
 * Ítem 339: registra un listener de `beforeunload` que avisa al usuario si
 * intenta cerrar/recargar la pestaña con cambios sin guardar.
 *
 * Genérico a propósito — recibe un booleano ya calculado por el caller (p.ej.
 * `formState.isDirty` de React Hook Form, o cualquier combinación de flags de
 * estado local), en vez de asumir una fuente de "dirty" específica. Ver patrón
 * de referencia (no reutilizado directamente) en
 * `components/landlord/edit-property-modal.tsx` líneas ~369-376.
 *
 * `isDirty` va como dependencia del efecto (en vez de espejarlo en un ref) para
 * no mutar refs durante el render — sólo re-registra el listener cuando el
 * booleano realmente cambia de valor, no en cada render.
 *
 * La mayoría de navegadores ignoran el texto de `returnValue` y muestran su
 * propio mensaje genérico; se setea igual por compatibilidad/accesibilidad.
 */
export function useUnsavedChanges(isDirty: boolean, mensaje: string = MENSAJE_POR_DEFECTO) {
  useEffect(() => {
    if (!isDirty) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = mensaje;
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty, mensaje]);
}
