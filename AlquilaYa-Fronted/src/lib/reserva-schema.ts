import { z } from 'zod';
import { differenceInCalendarDays, isBefore, startOfDay } from 'date-fns';

/**
 * Espeja las reglas de `CrearReservaRequest`/`ReservaService.crearSolicitud`
 * (servicio-propiedades):
 *  - fechaInicio no puede ser anterior a hoy (`@FutureOrPresent`, mismo mensaje del backend).
 *  - fechaFin debe ser estrictamente posterior a fechaInicio (mismo mensaje del backend).
 *
 * El backend no define un mínimo de días por período de alquiler (`PeriodoAlquiler` es solo
 * descriptivo); en cambio SIEMPRE factura por meses completos con un piso de 1 mes
 * (`CalculoMontoReserva.calcular`: `Math.max(1, Math.round(dias / 30.0))`). Por eso exigimos
 * aquí una estadía mínima de 30 días: sin este piso, un rango de pocos días se cobraría igual
 * como 1 mes completo sin que el desglose de precio (ítems 274/275) lo haya anticipado.
 */
const ESTADIA_MINIMA_DIAS = 30;

export const reservaSchema = z
  .object({
    fechaInicio: z.date({ required_error: 'Elige una fecha de entrada' }),
    fechaFin: z.date({ required_error: 'Elige una fecha de salida' }),
  })
  .refine((data) => !isBefore(data.fechaInicio, startOfDay(new Date())), {
    message: 'La fecha de inicio no puede ser anterior a hoy',
    path: ['fechaInicio'],
  })
  .refine((data) => isBefore(data.fechaInicio, data.fechaFin), {
    message: 'La fecha de fin debe ser al menos un día después de la fecha de inicio',
    path: ['fechaFin'],
  })
  .refine(
    (data) => differenceInCalendarDays(data.fechaFin, data.fechaInicio) >= ESTADIA_MINIMA_DIAS,
    {
      message: `La estadía mínima es de ${ESTADIA_MINIMA_DIAS} días (1 mes)`,
      path: ['fechaFin'],
    },
  );

export type ReservaFormValues = z.infer<typeof reservaSchema>;
