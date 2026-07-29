import { api } from '@/lib/api';
import type { ResumenFinanciero, ResumenFinancieroMes } from '@/services/pago-service';
import type { RegistroSemanal } from '@/services/admin-user-service';

/**
 * Ítem 354: response de `GET /usuarios/admin/metricas` (`AdminMetricasController#metricasAgregadas`
 * en servicio-usuarios), que reemplaza las 6 llamadas separadas que antes hacía
 * `metrics/page.tsx` (una por microservicio, vía `Promise.allSettled`).
 *
 * `resumenFinanciero` y `propiedadesPendientes` pueden llegar `null`: el backend los resuelve
 * vía Feign (servicio-pagos / servicio-propiedades respectivamente) con Circuit Breaker, y si
 * ese servicio remoto está caído, esa sección llega vacía sin tumbar el resto de la respuesta
 * (`estudiantes`/`arrendadores`/`admins`/`registrosPorSemana` son locales a servicio-usuarios y
 * siempre vienen poblados).
 */
interface ResumenFinancieroMesDTO {
  mes: string;
  cobrado: number;
  comision: number;
  arrendador: number;
  numPagos: number;
}

interface ResumenFinancieroDTO {
  totalCobrado: number;
  totalComision: number;
  totalArrendador: number;
  numPagos: number;
  porMes: ResumenFinancieroMesDTO[];
}

interface MetricasAgregadoDTO {
  resumenFinanciero: ResumenFinancieroDTO | null;
  propiedadesPendientes: number | null;
  estudiantes: number;
  arrendadores: number;
  admins: number;
  registrosPorSemana: RegistroSemanal[];
}

export interface MetricasAgregado {
  resumenFinanciero: ResumenFinanciero | null;
  propiedadesPendientes: number | null;
  estudiantes: number;
  arrendadores: number;
  admins: number;
  registrosPorSemana: RegistroSemanal[];
}

function normalizarMes(m: ResumenFinancieroMesDTO): ResumenFinancieroMes {
  return {
    mes: m.mes,
    cobrado: Number(m.cobrado ?? 0),
    comision: Number(m.comision ?? 0),
    arrendador: Number(m.arrendador ?? 0),
    numPagos: Number(m.numPagos ?? 0),
  };
}

/** BigDecimal del backend puede llegar como número o string según el serializador — igual que
 *  `pagoService.obtenerResumenFinanciero`, se normaliza todo con `Number(...)`. */
function normalizarResumen(dto: ResumenFinancieroDTO | null): ResumenFinanciero | null {
  if (!dto) return null;
  return {
    totalCobrado: Number(dto.totalCobrado ?? 0),
    totalComision: Number(dto.totalComision ?? 0),
    totalArrendador: Number(dto.totalArrendador ?? 0),
    numPagos: Number(dto.numPagos ?? 0),
    porMes: Array.isArray(dto.porMes) ? dto.porMes.map(normalizarMes) : [],
  };
}

/** Ítem 354: endpoint agregado para el dashboard de métricas admin (`metrics/page.tsx`). Solo ADMIN. */
async function obtenerMetricasAgregadas(): Promise<MetricasAgregado> {
  const { data } = await api.get<MetricasAgregadoDTO>('usuarios/admin/metricas');
  return {
    resumenFinanciero: normalizarResumen(data.resumenFinanciero),
    propiedadesPendientes: data.propiedadesPendientes ?? null,
    estudiantes: Number(data.estudiantes ?? 0),
    arrendadores: Number(data.arrendadores ?? 0),
    admins: Number(data.admins ?? 0),
    registrosPorSemana: Array.isArray(data.registrosPorSemana) ? data.registrosPorSemana : [],
  };
}

export const adminMetricasService = {
  obtenerMetricasAgregadas,
};
