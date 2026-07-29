import { api } from '@/lib/api';

/** Espejo de `com.alquilaya.serviciopagos.entities.Desembolso` (G1). */
export type EstadoDesembolso = 'PENDIENTE' | 'PROCESADO' | 'FALLIDO';

export interface Desembolso {
  id: number;
  arrendadorId: number;
  montoTotal: number;
  estado: EstadoDesembolso;
  metodoPago: string | null;
  referencia: string | null;
  motivoFallo: string | null;
  /** userId del admin que procesó/marcó el desembolso. Null mientras sigue PENDIENTE. */
  procesadoPor: number | null;
  fechaCreacion: string;
  fechaProcesado: string | null;
}

interface DesembolsoResponseDTO {
  id: number;
  arrendadorId: number;
  montoTotal: number;
  estado: EstadoDesembolso;
  metodoPago: string | null;
  referencia: string | null;
  motivoFallo: string | null;
  procesadoPor: number | null;
  fechaCreacion: string;
  fechaProcesado: string | null;
}

function fromDTO(dto: DesembolsoResponseDTO): Desembolso {
  return {
    id: dto.id,
    arrendadorId: dto.arrendadorId,
    montoTotal: Number(dto.montoTotal ?? 0),
    estado: dto.estado,
    metodoPago: dto.metodoPago,
    referencia: dto.referencia,
    motivoFallo: dto.motivoFallo,
    procesadoPor: dto.procesadoPor,
    fechaCreacion: dto.fechaCreacion,
    fechaProcesado: dto.fechaProcesado,
  };
}

export const desembolsoService = {
  /**
   * Ítem 326: historial de desembolsos (payouts) del arrendador autenticado, self-service —
   * el backend (`DesembolsoController#misDesembolsos`, `GET /api/v1/pagos/arrendador/desembolsos`)
   * filtra siempre por el `perfilId` del JWT, nunca por un id que venga del cliente.
   *
   * <p>V1 es admin-mediado (ver `DesembolsoService` en el backend): un admin genera el
   * desembolso pendiente, transfiere por fuera de la plataforma (banco/Yape/etc.) y lo marca
   * PROCESADO con la referencia — no hay pago automático real vía Mercado Pago todavía.
   */
  misDesembolsos: async (): Promise<Desembolso[]> => {
    const { data } = await api.get<DesembolsoResponseDTO[]>('/pagos/arrendador/desembolsos');
    return data.map(fromDTO);
  },
};
