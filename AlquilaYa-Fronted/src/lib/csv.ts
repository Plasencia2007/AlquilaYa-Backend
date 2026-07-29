function csvEscape(valor: string): string {
  return /[",\r\n]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor;
}

/**
 * Ítem 319/350/380: export 100% client-side (no hay `xlsx`/`papaparse` instalados y no se
 * agregan dependencias nuevas para esto). Mismo patrón de blob que
 * `reservationService.descargarContrato` (`Blob` + `URL.createObjectURL`), con un `<a download>`
 * para disparar la descarga en vez de abrir una pestaña. El BOM (`﻿`) es necesario para que
 * Excel abra los acentos bien.
 *
 * Extraído de `landlord/finances/{monthly,per-room}/page.tsx` (donde vivía duplicado byte-a-byte)
 * para que el ítem 380 (export en `DataTable`) y el 350 (reservas) lo reusen tal cual.
 */
export function descargarCsv(nombreArchivo: string, encabezados: string[], filas: (string | number)[][]) {
  const lineas = [encabezados, ...filas].map((fila) =>
    fila.map((v) => csvEscape(String(v))).join(','),
  );
  const contenido = '﻿' + lineas.join('\r\n');
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nombreArchivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
