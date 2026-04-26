/**
 * Genera un color HSL determinista a partir de un nombre.
 * Misma entrada => mismo color, perfecto para avatares sin imagen.
 */
export function colorDeNombre(nombre: string): { bg: string; fg: string } {
  if (!nombre) return { bg: 'hsl(0 0% 75%)', fg: 'hsl(0 0% 20%)' };
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) {
    hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return {
    bg: `hsl(${hue} 60% 55%)`,
    fg: 'hsl(0 0% 100%)',
  };
}

/**
 * Devuelve hasta 2 iniciales (primera letra del primer y último nombre/palabra).
 *   "Juan Pérez Rodríguez" → "JR"
 *   "María"               → "M"
 */
export function iniciales(nombre: string): string {
  if (!nombre) return '?';
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
  return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
}
