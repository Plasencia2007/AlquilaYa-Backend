import { api } from '@/lib/api';

interface PreferenciaResponse {
  /** URL de checkout de Mercado Pago. El backend la devuelve como { url }. */
  url: string;
}

async function crearPreferencia(reservaId: string | number): Promise<PreferenciaResponse> {
  const { data } = await api.post<PreferenciaResponse>(`/pagos/preferencia/${reservaId}`);
  return data;
}

export interface ResumenFinancieroMes {
  mes: string; // YYYY-MM
  cobrado: number;
  comision: number;
  arrendador: number;
  numPagos: number;
}

export interface ResumenFinanciero {
  totalCobrado: number;
  totalComision: number;
  totalArrendador: number;
  numPagos: number;
  porMes: ResumenFinancieroMes[];
}

/** Resumen financiero de plataforma (solo ADMIN). */
async function obtenerResumenFinanciero(): Promise<ResumenFinanciero> {
  const { data } = await api.get<ResumenFinanciero>('/pagos/admin/resumen');
  return {
    totalCobrado: Number(data.totalCobrado ?? 0),
    totalComision: Number(data.totalComision ?? 0),
    totalArrendador: Number(data.totalArrendador ?? 0),
    numPagos: Number(data.numPagos ?? 0),
    porMes: (data.porMes ?? []).map((m) => ({
      mes: m.mes,
      cobrado: Number(m.cobrado ?? 0),
      comision: Number(m.comision ?? 0),
      arrendador: Number(m.arrendador ?? 0),
      numPagos: Number(m.numPagos ?? 0),
    })),
  };
}

export const pagoService = { crearPreferencia, obtenerResumenFinanciero };
