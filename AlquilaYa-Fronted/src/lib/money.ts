const formatter = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const formatterConDecimales = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formatea un monto en soles (S/ 1,234). Sin decimales por defecto — los
 * precios de la plataforma son enteros; pasa `{ decimales: true }` para
 * montos que sí los necesitan (comisiones, cuotas prorrateadas).
 */
export function formatPEN(monto: number, opts?: { decimales?: boolean }): string {
  return (opts?.decimales ? formatterConDecimales : formatter).format(monto);
}
