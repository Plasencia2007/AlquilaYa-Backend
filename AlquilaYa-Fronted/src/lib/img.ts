/** Hosts permitidos por el optimizador de next/image (ver next.config.ts remotePatterns). */
const HOSTS_OPTIMIZABLES = new Set(['res.cloudinary.com', 'images.unsplash.com']);

/** Lado mínimo (px) aceptado para una foto. Debe coincidir con el backend (MIN_LADO_PX). */
export const MIN_LADO_PX = 500;

/**
 * Lee las dimensiones reales de un archivo de imagen en el navegador. Sirve para validar
 * la resolución ANTES de subir (feedback inmediato); el backend valida igual al recibir.
 */
export function leerDimensionesImagen(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen'));
    };
    img.src = url;
  });
}

/**
 * true si la imagen vive en un host externo que NO está en el allowlist de next/image.
 * Esas deben renderizarse con `unoptimized` para que el navegador las cargue directo del
 * host (sin pasar por el optimizador, que las rechazaría por no estar en remotePatterns).
 * URLs relativas/locales -> false (las maneja next/image normal).
 */
export function esImagenExterna(src: string): boolean {
  try {
    const host = new URL(src).hostname.replace(/^www\./, '').toLowerCase();
    return !HOSTS_OPTIMIZABLES.has(host);
  } catch {
    return false;
  }
}
